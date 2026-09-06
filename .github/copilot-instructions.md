# Agentic Spec Kit Development Guidelines

## Purpose

This repository is a workshop for spec-driven development with **Spec Kit**.
Its checked-in constitution and templates govern Azure infrastructure built with
Terraform and Azure Verified Modules (AVM). The repository also contains local
and application-focused labs that replace the constitution on a scratch
branch or in a separate workspace.

Start with `lab/01-legacy-vm/`. The independent deployment labs are
`lab/02-weatherview/` and `lab/03-aimarket/`.

## Active Infrastructure Baseline

- Infrastructure: Terraform with exact AVM module pins
- Authentication: managed identity and RBAC instead of shared secrets
- Networking: virtual network, delegated and private-endpoint subnets
- Operations: diagnostic settings routed to Log Analytics
- Validation: `terraform fmt`, `terraform validate`, and
  `.github/scripts/verify-avm.mjs`
- Region: `westus`

## Commands

```bash
terraform -chdir=lab/03-aimarket/infra init -backend=false
node .github/scripts/verify-avm.mjs --dir lab/03-aimarket/infra --offline
```

The root `infra/` path is reserved for the current legacy-VM presentation demo.
Use the commands above for the existing known-good reference until that demo
configuration has been generated and validated.

Application-specific commands belong to their labs. Provision and deploy
through `/azure-prepare`, `/azure-validate`, and `/azure-deploy`; do not continue
unless validation reports `Validated`. After teardown, confirm that the target
resource group no longer exists.

## Engineering Rules

- Treat `.specify/memory/constitution.md` as the authoritative standing policy.
- Use an AVM module when one covers the resource; document raw-resource
  exceptions beside the relevant lab's infrastructure in `infra/EXCEPTIONS.md`.
- Pin module versions exactly and commit `.terraform.lock.hcl`.
- Prefer managed identity, configure diagnostics where supported, and preserve a
  verified teardown path.
- Never commit or print secrets, state files, `.tfvars`, local databases, or
  generated Terraform working directories.

<!-- MANUAL ADDITIONS START -->

## Skills

Consult these reference skills in `.github/skills/` before relevant work (the
`speckit-*` folders are Spec Kit's commands, not reference material):

- `avm-terraform` — module selection, exact pinning, common AVM interfaces, and
  teardown-safe settings
- `data-access-abstraction` — repository pattern and the `DATA_PROVIDER` factory
- `container-apps-deployment` — Container Apps zone redundancy, managed-identity
  ACR pulls, the `VITE_API_URL` postdeploy hook, SPA nginx routing
<!-- MANUAL ADDITIONS END -->
