# Legacy VM Demo Infrastructure

This is the infrastructure directory for the current presentation story:
**The Legacy VM That Never Needed a Public IP**.

The Terraform generated during
[Demo 2](../lab/01-legacy-vm/legacy-vm-avm.md) belongs here. It should contain:

```text
infra/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── .terraform.lock.hcl
```

The configuration should use pinned Azure Verified Modules for the VM, Bastion,
networking, private storage, Key Vault, Log Analytics, and supported monitoring
resources.

After the configuration has been prepared:

```bash
terraform -chdir=infra init -backend=false
terraform -chdir=infra fmt -check -recursive
terraform -chdir=infra validate
node .github/scripts/verify-avm.mjs --dir infra --offline
```

The separate AIMarket Terraform reference is under
[`lab/03-aimarket/infra/`](../lab/03-aimarket/infra/).
