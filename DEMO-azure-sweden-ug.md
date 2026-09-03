# Demo Runbook — Azure Sweden User Group

## Session

**Deploying Azure Infrastructure using AVM and Spec‑Driven Development**

## Goal

Run a live demo that shows how to build an AIMarket-style app with **GitHub Spec‑Kit** and deploy with **Azure Verified Modules (AVM)**, using:

- **Bicep AVM** (primary path, already aligned with this repo)
- **Terraform AVM** (secondary path to show parity of approach)

Reference scenario:  
https://github.com/DanWahlin/github-azure-agentic-journeys/blob/main/journeys/aimarket/README.md

Repository reference:  
https://github.com/DanWahlin/github-azure-agentic-journeys/tree/main

---

## Explicit alignment to the AIMarket reference

- Keep the same AIMarket outcome and demo storyline from the reference journey.
- Execute the build flow with **GitHub Spec‑Kit** (`constitution → specify → plan → tasks → implement`) instead of a hand-written plan.
- Deploy with **Azure Verified Modules (AVM)**, with Bicep as the primary path and Terraform as parity.

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

## Timebox (15–20 minutes)

- 0:00–2:00 — session framing + architecture baseline
- 2:00–8:00 — GitHub Spec‑Kit flow (constitution/spec/plan/tasks/implement)
- 8:00–12:00 — AVM with Bicep (`azd up` path and module composition)
- 12:00–15:00 — Terraform AVM parity walkthrough
- 15:00–18:00 — app verification (search + assistant)
- 18:00–20:00 — cleanup, recap, audience Q&A

If time is tight, shorten implement details and keep Terraform to a structural comparison plus one `terraform plan` screenshot.

---

## Example prompts (copy/paste)

### Constitution

`/speckit.constitution Define standing engineering rules for an AIMarket-style Azure app: repository pattern via DATA_PROVIDER, server-side validation, money in integer cents, grounded AI responses only, AVM-first infrastructure, managed identity preference, no secrets in source, and deployment validation before release.`

### Specification

`/speckit.specify Create a feature spec for AIMarket with REST API + React storefront, product catalog, order flow, semantic product search, and an AI shopping assistant. Include acceptance criteria for graceful AI fallback and inventory-safe ordering.`

### Plan

`/speckit.plan Generate the implementation plan for the AIMarket spec, including architecture, data model, API routes, frontend flow, AI integration boundaries, and Azure deployment approach using AVM modules.`

### Tasks

`/speckit.tasks Generate dependency-ordered tasks from the plan with clear acceptance checks for API, UI, AI grounding/fallback, and deployment readiness.`

### Implement

`/speckit.implement Execute all tasks from tasks.md and summarize completed work plus any follow-up manual checks.`

### AVM Terraform parity prompt

`Create a Terraform AVM equivalent of the current Bicep AVM deployment architecture (resource grouping, registry, container apps, observability, and AI/search dependencies) and show module mapping for each major component.`

---

## Live demo flow

### 1) Explain the baseline (2 min)

- “This repo is a spec-driven variant of AIMarket.”
- “The app is generated and governed by GitHub Spec‑Kit artifacts.”
- “Infrastructure is AVM-first.”

### 2) Run GitHub Spec‑Kit workflow (6 min)

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

### 3) AVM with Bicep (primary) (4 min)

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

### 4) AVM with Terraform (secondary comparison segment) (3 min)

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

### 5) App verification (2–3 min)

- Open storefront and run:
  - semantic product search
  - AI shopping assistant prompts
- Confirm graceful behavior if AI endpoint is unavailable.

### 6) Cleanup (mandatory) (1–2 min)

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
