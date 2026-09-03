# Demo Runbook — Azure Sweden User Group

## Session

**Deploying Azure Infrastructure using AVM and Spec‑Driven Development**

## Goal

Run a live demo that shows how to build an AIMarket-style app with **GitHub Spec‑Kit** and deploy with **Azure Verified Modules (AVM)**, using:

- **Bicep AVM** (primary path, already aligned with this repo)
- **Terraform AVM** (secondary path to show parity of approach)

Reference scenario:  
https://github.com/DanWahlin/github-azure-agentic-journeys/blob/main/journeys/aimarket/README.md

---

## Demo narrative (what the audience should see)

1. Start from business intent, not code.
2. Use **Spec‑Kit** to generate constitution, specification, plan, and tasks.
3. Implement from generated tasks.
4. Provision/deploy Azure infrastructure with AVM.
5. Verify semantic search + AI assistant behavior.
6. Tear down resources.

---

## Prerequisites (before stage)

- VS Code + GitHub Copilot Chat signed in
- Node LTS, Azure CLI, AZD installed
- Terraform installed (for AVM Terraform segment)
- Azure subscription access and `az login`
- Azure Skills plugin installed in Copilot Chat
- Rehearsed once end-to-end with `azd up`

---

## Live demo flow

### 1) Explain the baseline

- “This repo is a spec-driven variant of AIMarket.”
- “The app is generated and governed by GitHub Spec‑Kit artifacts.”
- “Infrastructure is AVM-first.”

### 2) Run GitHub Spec‑Kit workflow

Use these steps in order:

1. **Constitution**  
   `/speckit.constitution` with engineering rules:
   - repository pattern via `DATA_PROVIDER`
   - server-side validation and money in cents
   - grounded AI responses only
   - AVM and secret-safe deployment rules

2. **Specification**  
   `/speckit.specify` for AIMarket capabilities:
   - products, orders, users
   - semantic search
   - AI shopping assistant

3. **Plan**  
   `/speckit.plan` to generate architecture and implementation design.

4. **Tasks**  
   `/speckit.tasks` to create dependency-ordered implementation tasks.

5. **Implement**  
   `/speckit.implement` to execute tasks and generate app/infrastructure code.

Talking point:  
“Spec‑Kit converts intent into governed artifacts before implementation starts.”

### 3) AVM with Bicep (primary)

Show generated or existing Bicep modules and highlight:

- Azure Container Apps environment + apps
- Azure AI Search
- Container Registry
- Monitoring resources
- Managed identity patterns

Deploy path:

```bash
azd up
```

Talking point:  
“AVM gives repeatable, vetted resource composition with less bespoke IaC.”

### 4) AVM with Terraform (secondary comparison segment)

Explain that the same infrastructure intent can be expressed with **Terraform AVM modules**:

- resource group + networking
- container apps + registry
- observability
- AI/search components as module composition

Suggested demo pattern:

1. Show equivalent module structure (same architecture, different IaC language).
2. Run standard Terraform workflow in a prepared sample folder:
   - `terraform init`
   - `terraform plan`
   - `terraform apply`
3. Compare outcomes with Bicep AVM deployment.

Talking point:  
“AVM is the consistency layer; Bicep vs Terraform is the delivery preference.”

### 5) App verification

- Open storefront and run:
  - semantic product search
  - AI shopping assistant prompts
- Confirm graceful behavior if AI endpoint is unavailable.

### 6) Cleanup (mandatory)

```bash
azd down --force --purge
```

If Terraform resources were created, also destroy them:

```bash
terraform destroy
```

---

## Fallback plan if live generation is slow

- Use a pre-generated branch containing completed Spec‑Kit artifacts.
- Continue from plan/tasks review and proceed directly to deploy + verification.
- Keep one screenshot each of constitution/spec/tasks as backup visuals.

---

## Speaker beats (short script)

- “We start with policy and intent, not implementation details.”
- “Spec‑Kit generates the engineering contract for delivery.”
- “AVM keeps infrastructure standardized and production-friendly.”
- “Same target architecture works with both Bicep AVM and Terraform AVM.”
- “This is reproducible: generate, implement, deploy, verify, clean up.”
