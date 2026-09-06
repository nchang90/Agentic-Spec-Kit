---
name: avm-terraform
description: |
  Azure Verified Modules (AVM) for Terraform — how to find the right module, pin it, wire the cross-cutting interfaces, and avoid the traps that only show up on the second deployment.
  USE FOR: choosing between avm-res / avm-ptn / avm-utl modules, resolving module source names, version pinning, the shared AVM interfaces (diagnostic_settings, private_endpoints, role_assignments, managed_identities, lock, tags, enable_telemetry), provider requirements, and teardown-blocking settings such as purge protection.
  DO NOT USE FOR: Bicep AVM modules (different registry and syntax), application code, or Container Apps *application* deployment mechanics (use container-apps-deployment).
---

# Azure Verified Modules — Terraform

AVM is a set of Microsoft-owned, Microsoft-tested Terraform modules with a
**common interface specification**. The value is not that a module writes an
`azurerm_key_vault` for you — it is that every module accepts diagnostics,
private endpoints, role assignments, locks and tags in *the same shape*, so a
governance rule can be expressed once and applied across the whole estate.

Read this before writing any `infra/*.tf`.

## 1. Finding the module

Source names are mechanical:

```
Azure/avm-<class>-<provider-namespace>-<resource-type>/azurerm
```

- `<class>` is `res` (one resource), `ptn` (a pattern composed of several), or
  `utl` (a utility that provisions nothing).
- `<provider-namespace>` is the ARM resource provider, lowercased and stripped of
  `Microsoft.` — `Microsoft.OperationalInsights` → `operationalinsights`.
- `<resource-type>` is the ARM type, lowercased with no separators —
  `managedEnvironments` → `managedenvironment` (note the **singular**).

```hcl
module "law" {
  source  = "Azure/avm-res-operationalinsights-workspace/azurerm"
  version = "0.5.1"
}
```

**Do not guess a source name and do not guess a version.** Confirm both against
the registry before writing the block:

```bash
curl -s https://registry.terraform.io/v1/modules/Azure/avm-res-keyvault-vault/azurerm \
  | jq -r '.version'                       # newest published version

curl -s https://registry.terraform.io/v1/modules/Azure/avm-res-keyvault-vault/azurerm/0.11.0 \
  | jq -r '.root.inputs[].name'            # the inputs that version actually accepts
```

A source name that does not resolve fails at `terraform init` — cheap. A version
that resolves but has a different input schema than you assumed fails somewhere
in the middle of an apply — expensive. The second command is the one people skip.

The browsable index is at
<https://azure.github.io/Azure-Verified-Modules/indexes/terraform/tf-resource-modules/>.

## 2. Pin exactly. Always.

**Every AVM module is pre-1.0, and pre-1.0 minor releases break.** `0.21.x` →
`0.22.0` on the virtual network module has moved subnet handling more than once.

```hcl
version = "0.11.0"     # correct
version = "~> 0.11"    # WRONG — 0.12.0 is a breaking change, and this accepts it
version = ">= 0.11"    # WRONG
# (omitted)            # WRONG — silently takes the newest release on every init
```

Pin the providers too, commit `.terraform.lock.hcl`, and upgrade deliberately:
read the module's release notes, bump one module, re-plan, review the diff.

## 3. The shared interfaces — and their real coverage

These inputs have the same shape across every module that implements them. This
is the entire point of AVM, and it is what lets one constitution rule apply
estate-wide.

| Input | Shape | What it gives you |
|---|---|---|
| `enable_telemetry` | `bool` | Microsoft's usage-tracking deployment. Set it explicitly either way. |
| `tags` | `map(string)` | Uniform tagging from one locals block. |
| `lock` | `object({ kind, name })` | `CanNotDelete` / `ReadOnly`. See §6 before using. |
| `role_assignments` | `map(object({ role_definition_id_or_name, principal_id, ... }))` | RBAC without a separate resource block. |
| `diagnostic_settings` | `map(object({ name, workspace_resource_id, log_categories, metric_categories, ... }))` | Logs and metrics to your workspace. |
| `private_endpoints` | `map(object({ subnet_resource_id, private_dns_zone_resource_ids, ... }))` | The PE, the NIC and the DNS zone group in one input. |
| `managed_identities` | `object({ system_assigned, user_assigned_resource_ids })` | Identity without a separate assignment resource. |

**Not every module implements every interface**, and that is usually because the
underlying Azure resource does not support the capability. Verified against the
registry on 2026-09-06:

| Module | `diagnostic_settings` | `private_endpoints` | `managed_identities` |
|---|:--:|:--:|:--:|
| `avm-res-resources-resourcegroup` | – | – | – |
| `avm-res-managedidentity-userassignedidentity` | – | – | – |
| `avm-res-network-privatednszone` | – | – | – |
| `avm-res-network-networksecuritygroup` | ✅ | – | – |
| `avm-res-network-virtualnetwork` | ✅ | – | – |
| `avm-res-operationalinsights-workspace` | ✅ | ✅ | – |
| `avm-res-keyvault-vault` | ✅ | ✅ | – |
| `avm-res-containerregistry-registry` | ✅ | ✅ | ✅ |
| `avm-res-app-managedenvironment` | ✅ | – | ✅ |

All nine implement `enable_telemetry`, `tags`, `lock` and `role_assignments`.

**Consequence for policy**: a rule like *"every resource emits diagnostics"* must
be scoped to resources that *can*. A resource group, a user-assigned identity and
a private DNS zone have no diagnostic categories in Azure at all. Write the rule
as "every resource that supports diagnostic settings", verify it against this
capability list, and record the non-supporting resources rather than pretending
the rule was met.

## 4. Provider requirements

AVM modules increasingly depend on **`azapi` as well as `azurerm`** — the
Container Apps managed environment module requires `Azure/azapi ~> 2.7`,
`hashicorp/azurerm ~> 4.0`, `Azure/modtm ~> 0.3` (telemetry) and
`hashicorp/random ~> 3.5`. Declare all of them in `required_providers` or
`terraform init` fails on a provider it cannot infer.

Check before writing the block:

```bash
curl -s https://registry.terraform.io/v1/modules/Azure/avm-res-app-managedenvironment/azurerm/0.5.0 \
  | jq -r '.root.provider_dependencies[] | "\(.source) \(.version)"'
```

**azurerm 4.x requires an explicit subscription**. Either set `subscription_id`
in the provider block or export `ARM_SUBSCRIPTION_ID`; without it the provider
errors at plan time with a message that reads like an authentication failure and
is not one.

```hcl
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

## 5. Wiring the interfaces

```hcl
locals {
  tags = {
    owner       = var.owner
    environment = var.environment
    expires     = var.expires_on
  }

  # One definition, reused by every module that supports it.
  diagnostics = {
    to_law = {
      name                  = "to-law"
      workspace_resource_id = module.law.resource_id
      log_groups            = ["allLogs"]
      metric_categories     = ["AllMetrics"]
    }
  }
}

module "acr" {
  source  = "Azure/avm-res-containerregistry-registry/azurerm"
  version = "0.8.0"

  name                = "cr${var.name_suffix}"
  resource_group_name = module.rg.name
  location            = var.location

  enable_telemetry    = true
  tags                = local.tags
  diagnostic_settings = local.diagnostics

  # Principle: identity, not secrets.
  admin_enabled = false
}
```

Note `module.law.resource_id`. AVM modules expose a consistent `resource_id`
output; prefer it over reassembling an ARM id by hand.

## 6. Traps that only bite the second time

**Key Vault purge protection cannot be turned off.** `purge_protection_enabled =
true` is irreversible for the life of the vault, and the soft-deleted vault holds
its name for the retention period. For anything you will redeploy — a demo, a
lab, a dev environment — set it `false` and
`soft_delete_retention_days = 7` (the minimum). If you are already stuck:

```bash
az keyvault list-deleted --query "[].{name:name,scheduledPurge:properties.scheduledPurgeDate}" -o table
az keyvault purge --name <name> --location <region>
```

The same applies to Cognitive Services accounts (`az cognitiveservices account
purge`) and to API Management.

**Resource locks defeat `terraform destroy`.** A `lock` set to `CanNotDelete`
blocks the destroy that Terraform itself issues, and the error appears after
several minutes of teardown. Do not set `lock` outside production.

**Private endpoints are SKU-gated.** Container Registry needs **Premium** for a
private endpoint — Basic and Standard silently do not offer one, and the module
input existing does not mean your SKU supports it. Key Vault Standard and Log
Analytics do support them. Premium ACR is roughly ten times the price of Basic;
check the SKU before adding the input.

**Private endpoints cost money even when idle** — about $0.01/hour each, plus a
few cents a month per private DNS zone. Three of them is a real line item on a
stack that is otherwise nearly free.

**Container Apps environment zone redundancy.** `zone_redundant = true` requires
both a supported region and a delegated infrastructure subnet of adequate size.
Leave it `false` for demos and single-region dev, and be explicit rather than
relying on the module default, which has changed.

**Log Analytics retention has a floor.** The pay-per-GB SKU will not accept fewer
than 30 days. Set it explicitly; do not try to shave cost by setting 7.

**Random suffixes break re-plannability.** `random_string` without
`keepers` regenerates and renames globally-unique resources on a later apply.
Derive the suffix deterministically — from the resource group id, the
subscription and environment name, or a checked-in variable.

**Never commit state.** `terraform.tfstate` contains every value the providers
read back, including secrets, regardless of `sensitive = true` in your
configuration. `.gitignore` it along with `.terraform/` and `*.tfvars`.

## 7. Before you apply

```bash
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=tfplan          # read it — this is the review artifact
```

Everything above is free. Module sourcing, version pinning, absent secrets,
diagnostic coverage and destroyability are all properties of the configuration
*text* — verify them before you spend anything. `.github/scripts/verify-avm.mjs`
in this repository does exactly that.

## 8. After you destroy

`terraform destroy` exiting zero is not proof. Confirm by absence:

```bash
az group exists --name <resource-group>            # must print: false
az keyvault list-deleted -o table                  # must not list your vault
```
