output "resource_group_name" {
  description = "Pass this to verify-avm.mjs --rg and to the teardown check."
  value       = module.resource_group.name
}

output "log_analytics_workspace_id" {
  description = "The single diagnostics sink for the platform."
  value       = module.log_analytics.resource_id
}

output "container_registry_login_server" {
  value = module.container_registry.login_server
}

output "container_apps_environment_id" {
  value = module.container_apps_environment.resource_id
}
