# The platform stack. Every resource comes from a pinned Azure Verified Module.
#
# Versions were resolved from the Terraform registry on 2026-09-06. Re-verify
# before reusing: AVM modules are pre-1.0 and minor releases break.

locals {
  # Deterministic uniqueness — Principle II. No random_string, so a re-plan of
  # an unchanged commit produces no changes.
  suffix = substr(sha1("${var.subscription_id}-${var.environment}"), 0, 8)

  tags = {
    owner       = var.owner
    environment = var.environment
    expires     = var.expires_on
    managed-by  = "terraform-avm"
  }

  # One definition of "observable", reused by every module that supports it.
  diagnostics = {
    to_law = {
      name                  = "to-law"
      workspace_resource_id = module.log_analytics.resource_id
      log_groups            = ["allLogs"]
      metric_categories     = ["AllMetrics"]
    }
  }
}

module "resource_group" {
  source  = "Azure/avm-res-resources-resourcegroup/azurerm"
  version = "0.4.0"

  name             = "rg-platform-${var.environment}-${local.suffix}"
  location         = var.location
  tags             = local.tags
  enable_telemetry = true
}

module "log_analytics" {
  source  = "Azure/avm-res-operationalinsights-workspace/azurerm"
  version = "0.5.1"

  name                = "log-platform-${local.suffix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.tags
  enable_telemetry    = true

  # 30 days is the floor for the pay-per-GB SKU. Explicit, not defaulted.
  log_analytics_workspace_retention_in_days = 30

  diagnostic_settings = {
    self = {
      name                           = "to-self"
      workspace_resource_id          = null
      use_workspace_resource_id_self = true
      log_groups                     = ["allLogs"]
      metric_categories              = ["AllMetrics"]
    }
  }
}

module "identity" {
  source  = "Azure/avm-res-managedidentity-userassignedidentity/azurerm"
  version = "0.5.2"

  name                = "id-platform-${local.suffix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.tags
  enable_telemetry    = true
}

module "network_security_group" {
  source  = "Azure/avm-res-network-networksecuritygroup/azurerm"
  version = "0.5.1"

  name                = "nsg-platform-${local.suffix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.tags
  enable_telemetry    = true
  diagnostic_settings = local.diagnostics
}

module "virtual_network" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "0.22.2"

  name                = "vnet-platform-${local.suffix}"
  parent_id           = module.resource_group.resource_id
  location            = var.location
  address_space       = ["10.40.0.0/16"]
  tags                = local.tags
  enable_telemetry    = true
  diagnostic_settings = local.diagnostics

  subnets = {
    infrastructure = {
      name             = "snet-infra"
      address_prefixes = ["10.40.0.0/23"]
      delegations = [{
        name = "Microsoft.App/environments"
        service_delegation = {
          name = "Microsoft.App/environments"
        }
      }]
    }
    private_endpoints = {
      name                              = "snet-pe"
      address_prefixes                  = ["10.40.2.0/24"]
      private_endpoint_network_policies = "Disabled"
      network_security_group = {
        id = module.network_security_group.resource_id
      }
    }
  }
}

module "key_vault" {
  source  = "Azure/avm-res-keyvault-vault/azurerm"
  version = "0.11.0"

  name                = "kv-plat-${local.suffix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  tags                = local.tags
  enable_telemetry    = true
  diagnostic_settings = local.diagnostics

  # Principle III — RBAC, not access policies.
  legacy_access_policies_enabled = false

  # Principle V — the vault must be removable and its name reusable.
  purge_protection_enabled   = false
  soft_delete_retention_days = 7

  public_network_access_enabled = false
  network_acls = {
    bypass         = "AzureServices"
    default_action = "Deny"
  }

  private_endpoints = {
    vault = {
      name                          = "pe-kv-${local.suffix}"
      subnet_resource_id            = module.virtual_network.subnets["private_endpoints"].resource_id
      private_dns_zone_resource_ids = [module.private_dns_vault.resource_id]
    }
  }

  role_assignments = {
    platform_identity = {
      role_definition_id_or_name = "Key Vault Secrets User"
      principal_id               = module.identity.principal_id
    }
  }
}

module "private_dns_vault" {
  source  = "Azure/avm-res-network-privatednszone/azurerm"
  version = "0.5.0"

  domain_name      = "privatelink.vaultcore.azure.net"
  parent_id        = module.resource_group.resource_id
  tags             = local.tags
  enable_telemetry = true

  virtual_network_links = {
    platform = {
      vnetlinkname     = "link-vnet-platform"
      vnetid           = module.virtual_network.resource_id
      autoregistration = false
    }
  }
}

module "container_registry" {
  source  = "Azure/avm-res-containerregistry-registry/azurerm"
  version = "0.8.0"

  name                = "crplat${local.suffix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  sku                 = "Basic"
  tags                = local.tags
  enable_telemetry    = true
  diagnostic_settings = local.diagnostics

  # Principle III — no admin credentials; the platform identity pulls with RBAC.
  # Basic SKU does not support private endpoints; Premium is ~10x the cost.
  admin_enabled = false

  role_assignments = {
    platform_pull = {
      role_definition_id_or_name = "AcrPull"
      principal_id               = module.identity.principal_id
    }
  }
}

module "container_apps_environment" {
  source  = "Azure/avm-res-app-managedenvironment/azurerm"
  version = "0.5.0"

  name                = "cae-platform-${local.suffix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.tags
  enable_telemetry    = true
  diagnostic_settings = local.diagnostics

  # Requires a supported region and an adequately sized delegated subnet.
  # Explicit rather than inherited — the module default has changed before.
  zone_redundant = false

  vnet_configuration = {
    infrastructure_subnet_id = module.virtual_network.subnets["infrastructure"].resource_id
    internal                 = false
  }

  log_analytics_workspace = {
    resource_id = module.log_analytics.resource_id
  }

  managed_identities = {
    user_assigned_resource_ids = [module.identity.resource_id]
  }
}

data "azurerm_client_config" "current" {}
