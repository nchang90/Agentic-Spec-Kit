# Demo 2 — From Specification to Governed AVM Infrastructure

This demo belongs immediately after the presentation's **Worked Example** slide.
It completes the story started in
[Demo 1](demo-1-durable-specification.md):

## Story: The Legacy VM That Never Needed a Public IP

Demo 1 replaced a vague migration prompt with an approved specification. Demo 2
shows that the specification controls the architecture, Terraform, and
validation evidence.

The scenario is adapted from Microsoft's
[experimental AVM Spec Kit example](https://azure.github.io/Azure-Verified-Modules/experimental/ai-assisted-sol-dev/spec-kit/avm-example/).
That page provides the reference architecture and a detailed Spec Kit
walkthrough. This runbook uses the repository's current command names, Terraform
conventions, and executable AVM verifier.

> **Experimental source:** treat the Microsoft example as learning material, not
> as a production reference architecture. Review generated infrastructure
> against current organizational requirements and current AVM documentation.

## Demo outcome

By the end of Demo 2, the audience has seen:

1. Requirements become explicit architecture decisions.
2. Architecture decisions become dependency-ordered work.
3. The work becomes pinned Azure Verified Modules.
4. Spec Kit checks implementation completeness.
5. Terraform and the AVM verifier produce infrastructure-specific evidence.

Do not generate or deploy the full workload live. Use prepared artifacts and run
only the fast, local validation commands.

## Reference architecture

The workload contains:

- one Windows Server 2016 VM with at least 2 CPU cores and 8 GB of memory;
- a Standard HDD operating-system disk and a 500 GB data disk;
- Azure Bastion for authenticated RDP without a public VM address;
- an HDD-backed Azure Files share reached through a private endpoint;
- private DNS for the storage endpoint;
- Azure Key Vault for the generated administrator credential;
- a Log Analytics workspace for supported diagnostic data; and
- critical alerts for VM availability, disk capacity, and Key Vault access
  failures.

High availability, disaster recovery, and horizontal scaling are intentionally
out of scope for this retained single-instance workload.

## Demo flow

| Beat | Demo action | Evidence |
|---|---|---|
| Recall the contract | Open the approved `spec.md` from Demo 1 | Security and operational outcomes are explicit. |
| Design from intent | Open the generated `plan.md` | Each important requirement has an architecture decision. |
| Make work traceable | Open `tasks.md` | Networking, identity, compute, storage, monitoring, and validation are dependency ordered. |
| Inspect the implementation | Open prepared Terraform under `infra/` | Resources use pinned AVM modules and shared interfaces. |
| Prove the policy | Run Terraform validation and the AVM verifier | Invalid sourcing, versioning, diagnostics, or lifecycle choices fail before deployment. |
| Close the loop | Show `/speckit-converge` output | Missing implementation work returns to `tasks.md`. |

**Opening line:**

> "The specification tells us what secure means. Now we can test whether the
> implementation actually follows it."

---

## Before the demo

Prepare these artifacts on the same branch used for Demo 1:

```text
specs/<NNN-legacy-workload>/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md

infra/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── .terraform.lock.hcl
```

The generated infrastructure belongs in the repository's root `infra/`
directory because the legacy VM is the current presentation demo. The AIMarket
reference is kept separately under `lab/03-aimarket/infra/`.

Before the session:

```bash
terraform -chdir=infra init -backend=false
terraform -chdir=infra fmt -check -recursive
terraform -chdir=infra validate
node .github/scripts/verify-avm.mjs \
  --dir infra \
  --offline
```

Commit the prepared artifacts on the demo branch so an intentional validation
failure can be restored safely.

---

## Step 1 — Reopen the approved specification

Open the `spec.md` produced in Demo 1 and highlight these requirements:

- no public IP address or internet-exposed RDP;
- authenticated private administrative access;
- a privately reachable file share;
- generated credentials stored outside source and ordinary output;
- centralized monitoring and critical alerts; and
- validation before deployment.

**Talking point:** these are observable outcomes. The specification does not
need to know the names of Terraform resources or AVM modules.

---

## Step 2 — Plan the implementation

Use the prepared `plan.md`. During rehearsal, generate it with:

```text
/speckit-plan Implement the approved legacy workload specification with
Terraform and Azure Verified Modules.

Place the Terraform configuration in infra. Use AVM modules
before raw AzureRM resources. Confirm every module source and version against
the Terraform Registry, pin every module to an exact version, and commit the
provider lock file.

Design private networking for the VM, Azure Bastion, the storage private
endpoint, and private DNS. The VM must have no public IP. Use Azure Key Vault
with RBAC authorization for the generated administrator credential and do not
expose the credential through Terraform outputs.

Send supported diagnostic data to Log Analytics and define critical alerts for
VM availability, disk capacity, and failed Key Vault access. Reuse AVM shared
interfaces for tags, role assignments, private endpoints, identities, and
diagnostic settings where the selected modules support them.

Target westus. Keep the demo environment reversible: do not enable resource
locks or Key Vault purge protection. Include Terraform and constitutional
validation before any deployment step.
```

In `plan.md`, trace each requirement to its decision:

| Specification requirement | Planned decision |
|---|---|
| No public RDP | Private VM network interface plus Azure Bastion |
| Private shared storage | Azure Files, private endpoint, and private DNS |
| Protected credential | Generated secret stored in an RBAC-enabled Key Vault |
| Central diagnostics | Supported resource diagnostics sent to Log Analytics |
| Critical notification | Alert rules for the three named operational risks |
| Repeatable delivery | Exact AVM pins, provider lock file, and validation gates |

**Talking point:** AVM is the implementation vocabulary. It belongs in the plan,
not in the user-facing specification.

---

## Step 3 — Derive and inspect the work

During rehearsal, run:

```text
/speckit-tasks
/speckit-analyze
```

Open `tasks.md` and show that dependencies determine the order:

1. Provider and naming foundations.
2. Resource group and monitoring workspace.
3. Network, subnets, and private DNS.
4. Key Vault and access assignments.
5. Storage, file share, and private endpoint.
6. VM and Bastion.
7. Diagnostic settings and alerts.
8. Validation and evidence.

Use `/speckit-analyze` before implementation to find conflicts or requirements
that have no corresponding task.

---

## Step 4 — Trace requirements into AVM

Open the prepared Terraform configuration. Do not walk through every line.
Follow one requirement across the delivery chain:

```text
spec.md requirement
        ↓
plan.md architecture decision
        ↓
tasks.md implementation task
        ↓
pinned AVM module and inputs
        ↓
validation evidence
```

Show these details:

- every AVM `source` follows the `Azure/avm-.../azurerm` convention;
- every AVM module has an exact `version`;
- the provider lock file is committed;
- the VM has no public IP association;
- storage public access is disabled and private connectivity is configured;
- Key Vault uses RBAC and does not expose the credential as an output;
- diagnostics are configured only where the Azure resource supports them; and
- locks and irreversible purge protection are absent from the demo environment.

Do not claim that AVM automatically proves the design is secure. AVM provides
consistent, tested building blocks; the specification, review, and validation
still determine whether they were assembled correctly.

---

## Step 5 — Make the policy fail visibly

On the prepared demo branch, change one AVM module from an exact version:

```hcl
version = "0.0.0"
```

to a range:

```hcl
version = "~> 0.0"
```

Use the actual prepared version in place of `0.0.0`. Then run:

```bash
node .github/scripts/verify-avm.mjs \
  --dir infra \
  --offline
```

The verifier should reject the non-exact pin. Restore the committed file:

```bash
git restore infra
```

Run the complete local gate:

```bash
terraform -chdir=infra fmt -check -recursive
terraform -chdir=infra validate
node .github/scripts/verify-avm.mjs \
  --dir infra \
  --offline
```

**Talking point:** policy is useful when it can stop a non-compliant change, not
only describe one.

---

## Step 6 — Converge against the specification

Show the prepared result of:

```text
/speckit-converge
```

Explain the division of responsibility:

- `/speckit-converge` compares the codebase with `spec.md`, `plan.md`, and
  `tasks.md`, then appends remaining implementation work to `tasks.md`.
- `terraform validate` checks Terraform configuration validity.
- `verify-avm.mjs` checks the repository's executable infrastructure policy,
  including AVM sourcing, exact version pins, credential patterns, diagnostics,
  and reversibility.

A green Terraform validation does not prove requirement completeness, and a
green convergence result does not prove that Terraform is valid. Both forms of
evidence are required.

---

## Closing

Return to the requirement-to-evidence table and close with:

> "The team did not merely generate a secure-looking VM. It traced approved
> intent into architecture, ordered work, pinned AVM modules, and evidence—and
> the VM never needed a public IP."

The audience should leave with this chain:

```text
SPEC → PLAN → TASKS → IMPLEMENT → CONVERGE → VALIDATE
```

## Demo recovery

- **Model output is slow:** use the prepared `plan.md`, `tasks.md`, and
  Terraform.
- **Terraform initialization needs network access:** use the already initialized
  working directory and run the verifier with `--offline`.
- **The intentional failure does not appear:** show the saved failing output,
  restore the branch, and continue.
- **A module interface has changed:** use the committed lock file and prepared
  configuration; investigate upgrades after the session.
- **Azure authentication is unavailable:** do not run `terraform plan` or
  deploy. Local validation is sufficient for this demo.

This demo does not run `terraform apply`, so it creates no Azure resources and
requires no cloud cleanup.
