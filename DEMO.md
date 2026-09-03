# Demo Runbook — Building AIMarket using Spec-Driven Development

**Source scenario**: [DanWahlin/github-azure-agentic-journeys → journeys/aimarket](https://github.com/DanWahlin/github-azure-agentic-journeys/tree/main/journeys/aimarket).

That journey hands a hand-written `PLAN.md` to GitHub Copilot CLI and builds
incrementally. **This runbook rebuilds the same app with spec-kit** — so the
spec, the plan, and the task list are *generated and governed*, not authored by
hand.

**What gets built**: AIMarket — a marketplace API (Node/TypeScript + Express +
SQLite) and a React storefront, plus semantic search (Azure AI Search) and a
shopping assistant (Microsoft Foundry, `gpt-5-mini`), deployed to Azure
Container Apps via `azd` + Bicep/AVM.

> ### ⚠️ This demo deploys. Budget for it.
>
> The finale is `azd up` — real resources in your subscription, **~$100–115/month
> while they exist**:
>
> | Resource | SKU | Monthly |
> |---|---|---|
> | Azure AI Search | Basic (semantic ranking) | **~$75** |
> | Container Apps (2, scale-to-zero) | Consumption | ~$10–20 |
> | Microsoft Foundry | Pay-per-token (`gpt-5-mini`) | ~$5–10 |
> | Container Registry | Basic | ~$5 |
> | App Insights + Log Analytics | Pay-per-GB | ~$2–5 |
>
> AI Search Basic **does not scale to zero** — it is the whole story.
>
> **Want a spec-kit demo that deploys and still costs nothing?**
> `DEMO-weatherview.md` — Azure Static Web Apps Free tier, $0, no keys, no
> containers.
>
> **But you are not running this for a month.** Prorated, the whole stack is
> roughly **$0.13/hour**, so a rehearsal plus a talk lands well under a dollar,
> and a full day is about $3. The monthly figure only bites if you forget to tear
> down — which is why `azd down --force --purge` is on the last slide.
>
> **`azd down --force --purge` is mandatory, not optional.** Put it on the last
> slide so you can't forget it.
>
> There is a local checkpoint partway through where the app runs on `localhost`
> with the AI features degrading gracefully. That's a rehearsal gate and a
> fallback if the deploy misbehaves live — not the finish line.

---

## 0. Before you walk on stage (prep checklist)

- [ ] VS Code open on this repo, **GitHub Copilot Chat** signed in
- [ ] `node --version` (LTS), `az version`, `azd version` (>= 1.28.0)
- [ ] `az login` done; `azd config set auth.useAzCliAuth true`
- [ ] **Azure Skills plugin** installed — it is *two* commands, and the
      marketplace add is easy to forget:
      `/plugin marketplace add microsoft/azure-skills` then
      `/plugin install azure@azure-skills`
- [ ] Model availability confirmed in your region —
      `az cognitiveservices model list --location westus --query "[?model.name=='gpt-5-mini' || model.name=='gpt-5.4-mini']"`
- [ ] Font size up, theme high-contrast, notifications off
- [ ] Working branch clean: `git status` shows no generated `specs/`, and the
      adopted AIMarket constitution is present
- [ ] **Fallback branch baked** in case live generation stalls
- [ ] **A full `azd up` rehearsed end-to-end at least once.** First deploys hit
      ACR auth and image-build friction; do not meet those for the first time on
      stage.

---

## The five phases

### Step 0 — Choose where the app gets generated

Two options. Both work; pick one before you present and don't switch mid-run.

#### Option A — same repo (simplest)

Just start at Step 1. Spec-kit was initialized here, so `/speckit.specify`
creates branch `001-aimarket` and `specs/001-aimarket/`, and the app lands
alongside it. The vendored skills and the verifier are already in place — nothing
to copy, no `cd`, one git history.

`.gitignore` already covers `node_modules/`, `*.db`, `.azure/` and `dist/`, so
`git status` stays readable.

One expected change: `/speckit.plan` rewrites `## Active Technologies` in
`.github/copilot-instructions.md`. This is safe; content between the
`MANUAL ADDITIONS` markers survives.

#### Reset before another demo run

Each run leaves four things to remove or restore:

1. The generated feature branch.
2. Untracked generated files, including `specs/` and the application code.
3. The tracked constitution file, which `/speckit.constitution` updates in place.
4. The ignored SQLite database, which may contain orders and reduced inventory
   from the previous run.

From the repository root, first return to `main` and delete only the feature
branch you are currently demonstrating:

```bash
feature_branch=$(git branch --show-current)
case "$feature_branch" in [0-9][0-9][0-9]-*) ;; *) echo "Not on a spec-kit feature branch; stop." >&2; exit 1 ;; esac
git switch main
git branch -D "$feature_branch"
```

Then preview the generated untracked files:

```bash
git clean -nd
```

If the preview contains only generated demo files, delete them and reset the
tracked and ignored demo state:

```bash
git clean -fd
git restore .specify/memory/constitution.md
git clean -fdX -- '*.db' '*.db-shm' '*.db-wal'
```

Use this only in the dedicated demo checkout. `git clean -fd` permanently
deletes untracked files, so do not run it until its preview is safe. The branch
guard supports any spec-kit branch beginning with three digits, such as
`001-aimarket-marketplace`; it prevents accidentally deleting `main` or another
unrelated branch.

### Step 1 — Constitution

Everything here is a *standing rule* — it constrains
every later phase and gets checked against. Note what's in it: these are the
cross-cutting engineering policies that, in the original journey, live scattered
across a 700-line `PLAN.md` and a set of skill files.

```
/speckit.constitution Define the standing engineering rules for a cloud-native
full-stack application deployed to Azure.

Architecture: API routes access storage only through repository contracts selected
by DATA_PROVIDER, defaulting to SQLite. Changing storage providers must not require
route changes.

Data integrity: Validate all client input on the server. Store and calculate money
in integer cents. Validate referenced entities before writes.

AI: AI features must degrade gracefully and be grounded only in supplied catalog
data; they must not invent products.

Infrastructure and security: Use declarative Bicep and Azure Verified Modules
where available. Prefer managed identity and never put secrets in source code.

Delivery: Build container images in Azure, validate before deployment, and deploy
to West US (westus).

```
**Talking point**: *"Nothing in that constitution mentions a product or an
endpoint. It's policy. Watch it show up as a constraint in the plan, and as
acceptance criteria in the tasks."*

---

### Step 2 — Specify

The functional "what". Deliberately no technology choices — those come in Step 3.

```
/speckit.specify Create a specification called "01-aimarket" for AIMarket, a
marketplace with a REST API, a web storefront, semantic product search, and a
conversational shopping assistant.

Entities: Product — name, description, short description, price, category (one of
Electronics, Clothing, Home, Sports, Books, Toys), tags, inventory, rating, review
count, image URL, seller, and status (draft, active or archived). Order — buyer,
line items carrying quantity and price at purchase, server-calculated total,
shipping address, and status moving pending to confirmed to shipped to delivered,
or pending to cancelled. User — unique email, name, and role of buyer or seller.
Ids are UUIDs, timestamps ISO 8601, and money is validated as a positive amount.

Order placement: every product must exist, be active, and have enough inventory;
inventory decrements on purchase; price at purchase and the order total come from
the server, never from the request.

API: GET /api/health plus resource routes under /api/products, /api/orders,
/api/users and /api/chat. Product listing supports pagination and filters for
category, price range and status. Errors share one shape — code, message, and a
details array only on validation errors — using VALIDATION_ERROR, DUPLICATE_EMAIL
and INSUFFICIENT_INVENTORY at 400, NOT_FOUND at 404, AI_RESPONSE_ERROR at 502, and
INTERNAL_ERROR at 500.

Storefront — three pages: a responsive grid of active products with search and
category filters; a product detail page with a quantity selector and a disabled
out-of-stock state; and a cart with editable quantities leading to an order
confirmation. Cart state is client-side and resets on refresh, and all API calls
go through a single API client module.

Semantic search: a search endpoint that matches intent rather than keywords,
backed by an index over the catalog, with a storefront toggle between plain
filtering and semantic search.

Shopping assistant: a chat endpoint taking message history and returning a reply,
surfaced as a collapsible floating widget. Every request supplies the current
catalog so answers reference only real inventory.

Seed data: two users — buyer Alex Johnson and seller Jordan Lee — and exactly ten
active products spanning the categories, including a laptop named "UltraBook Pro
15".

Acceptance criteria: health returns 200; all ten products render with images;
placing an order decrements inventory; semantic search returns relevant non-empty
results; and asked to compare products, the assistant replies with catalog
products by name, including UltraBook Pro 15.
```

**Optional, and a great beat if you have time:**

```
/speckit.clarify
```

Watch what it asks about. The original `PLAN.md` had to pre-answer these
questions by hand; spec-kit surfaces them as a checklist.

---

### Step 3 — Plan

Now, and only now, the technology.

```
/speckit.plan Implement the API in Node.js with TypeScript and Express, using better-sqlite3 for local storage with journal_mode=WAL and foreign_keys=ON, storing the database at api/aimarket.db and gitignoring it. Serialize arrays and objects as JSON strings; use an order_items junction table. Listen on 0.0.0.0 port 3000, honoring the PORT environment variable.

Implement the storefront as React 18 with Vite and Tailwind CSS. In development, proxy /api to localhost:3000. In production, read the API base URL from VITE_API_URL at build time.

For AI: use Azure AI Search (Basic SKU, semantic ranker enabled) with an index named aimarket-products, and Microsoft Foundry hosting gpt-5-mini, falling back to gpt-5.4-mini where gpt-5-mini is unavailable in the region.

For Azure: deploy to Azure Container Apps with azd and Bicep. Use the Azure Skills plugin — call azure_bicep_schema to confirm AVM module properties and current API versions rather than guessing them, and azure_deploy_plan to validate before deploying. Prefer AVM modules: avm/ptn/azd/monitoring, avm/res/container-registry/registry, avm/res/search/search-service, avm/res/app/managed-environment, avm/res/app/container-app, and avm/ptn/ai-ml/ai-foundry. Pin module versions. Do not write custom resources where an AVM module exists.

For the shopping assistant, set GPT-5 reasoning effort to minimal and allow at least 2000 completion tokens — GPT-5 can spend a smaller budget entirely on hidden reasoning and return an empty message. Map an empty model response to HTTP 502 with code AI_RESPONSE_ERROR rather than letting it surface as a 500. Include a comparison-query regression test.

Two local skills in .github/skills/ carry the hard-won details — read them before generating code. Use data-access-abstraction for the repository pattern and the DATA_PROVIDER factory. Use container-apps-deployment for azure.yaml structure, Container Apps zone redundancy, managed-identity ACR pulls, the VITE_API_URL postdeploy hook, nginx SPA routing, and cross-platform image builds.

Honor the constitution's managed-identity rule: the API container app authenticates to Foundry with a system-assigned identity granted the Cognitive Services User role, and pulls images from ACR with AcrPull — not with admin credentials.
```

**Optional:**

```
/speckit.checklist
```

---

### Step 4 — Tasks

```
/speckit.tasks
```

**This is the moment to slow down.** Put the generated task list next to the
journey's README side by side on screen. The journey walks you through four
phases of prompts a human wrote. Spec-kit *derived* an ordered, dependency-aware
task list from the spec — and each task carries acceptance criteria traceable
back to the constitution.

---

### Step 5 — Implement

```
/speckit.implement
```

---

## The delegation beat (optional, and the strongest tie-in)

The aimarket journey's Phase 3 makes a point of **delegating** well-scoped work
to the GitHub Copilot cloud agent. Spec-kit has a command for exactly that:

```
/speckit.taskstoissues
```

It turns the generated task list into GitHub issues. Assign one to the Copilot
coding agent and let it open a PR while you keep talking.

**Talking point**: *"The journey says 'a well-defined issue with acceptance
criteria makes a good candidate for delegation.' That's true — and writing those
issues by hand is the work. Here the spec produced them."*

---

## Checkpoint — run it locally

```bash
cd specs/01-aimarket        # check the chat for where implement actually wrote it
npm install
npm run dev                 # API on :3000, storefront on :5173
```

Show in the browser: ten products, filter by category, add to cart, place an
order, then reload the product detail page and point at the **decremented
inventory** — that's server-side state the spec dictated. Open the chat widget:
it returns 503, cleanly, exactly as the constitution demanded. *"The AI isn't
wired up yet and the app didn't break. That's a rule, not an accident."*

Worth showing even though you're deploying — it's the strongest evidence the
constitution is doing real work, and it's your fallback if the deploy misbehaves.

## The finale — `azd up`

### Pre-flight (do this the day before, not on stage)

Unregistered providers fail the deploy several minutes in:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.Search
az provider register --namespace Microsoft.CognitiveServices
az provider register --namespace Microsoft.OperationalInsights
```

Confirm a supported model exists in the region. **If this returns empty, stop —
do not provision:**

```bash
az cognitiveservices model list --location westus \
  --query "[?model.name=='gpt-5-mini' || model.name=='gpt-5.4-mini'].{name:model.name, version:model.version}" \
  --output table
```

### Generate the infrastructure

`/speckit.implement` writes the app. Infrastructure is its own beat, and the
prompt stays short because the requirements live in the spec and the skill — not
in the prompt:

```
Read the deployment requirements in the spec and the container-apps-deployment skill. Create everything they specify to deploy AIMarket to Azure Container Apps: Bicep in infra/, Dockerfiles and .dockerignore for api/ and client/, azure.yaml, and the required postdeploy hook wired into azure.yaml. Node.js API + React client. Location westus. Log issues to issues.md.
```

**Talking point** — this is the whole thesis in one slide: *"That prompt is four
lines. It doesn't mention ACR two-phase auth, or zone redundancy, or the
VITE_API_URL timing problem. Those live in the spec and the skill. When your team
learns a new gotcha, you record it there — not in an ever-longer prompt."*

### Review before you deploy — the constitution's own rule

Step 1 said *always run a validation before running a deployment*. Honor it:

```
Perform a read-only pre-deployment review of the generated AIMarket infrastructure and container configuration. Do not modify files or deploy. Check every deployment requirement in the spec and in the container-apps-deployment skill, including its two-phase ACR access pattern and the postdeploy hook contract. Run any existing read-only Bicep or azd validation commands that do not create resources. Return: (1) PRE-DEPLOYMENT STATUS: READY or NOT READY; (2) a table with each requirement, PASS or FAIL, and file/line evidence; (3) every blocking issue and the smallest exact fix. Do not report READY while any required check is unresolved.
```

Show the PASS/FAIL table on screen. It's the most concrete answer you have to
*"how do you know the agent got it right?"*

### Deploy

Set the subscription **on the azd environment** — a shell `export` is not
enough:

```bash
az account show --query id --output tsv        # copy the value
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>
azd up                    # provisions AVM-based Bicep, builds images in ACR
```

Do not continue until both `azd up` **and** the `postdeploy` hook exit
successfully. Several minutes — fill it by opening `infra/hooks/postdeploy.js`
and tracing how `VITE_API_URL` gets set after provisioning, or by asking the room
why the API and storefront are separate Container Apps.

Then read the storefront URL and confirm products load:

```bash
azd env get-value WEB_URL
```

If they don't, the postdeploy hook is the culprit — re-run it directly:

```bash
node infra/hooks/postdeploy.js
```

### ⚠️ Populate the search index before you demo search

`azd up` creates the `aimarket-products` index **empty**. Semantic search will
return nothing and look broken. This is the single most likely live failure:

```
Push all products from the data store to the Azure AI Search index.
```

### Beat 1 — semantic search (Azure AI Search)

Toggle **AI Search** on and search by *intent*, not keywords: *"something for a
long flight"*. Keyword search matches none of those words; the semantic ranker
returns the laptop and the headphones.

Then toggle AI Search **off** and run the same query — the client-side filter
returns nothing. That A/B is the clearest thirty seconds in the demo.

### Beat 2 — the shopping assistant (Microsoft Foundry)

Open the chat widget and ask it to **compare two laptops**. It should name
**UltraBook Pro 15** from the real catalog. Point out that no product data was
fine-tuned into anything — the catalog is passed as context on every request,
which is why it can't invent merchandise. That's a constitution rule from Step 1
paying off.

### Verify against the acceptance criteria

Don't eyeball it — this repo ships a verifier:

```bash
node .github/scripts/verify-aimarket.mjs        # reads API_URL / WEB_URL from azd
```

Or point it anywhere explicitly:

```bash
node .github/scripts/verify-aimarket.mjs --api https://ca-api-xxx.azurecontainerapps.io --web https://ca-web-xxx.azurecontainerapps.io
```

It runs every check even after one fails, so a red run tells you everything
that's wrong in one pass, and exits non-zero. Success prints:

```
PASS: health, 10 products, images, search, chat, storefront, and API integration
```

The checks map one-to-one onto the acceptance criteria from Step 2: health
returns 200 with `{status:"ok"}`; exactly 10 products including **UltraBook Pro
15**; every `imageUrl` loads; semantic search returns a non-empty result; the
assistant answers a *comparison* prompt and names a real catalog product; the
storefront returns 200; and the built bundle references the deployed API host
rather than `localhost`.

Each failure names its likely cause — an empty search index, a catalog missing
from the system prompt, a bundle built without the `/api` segment — so a live
failure becomes a diagnosis instead of a guess.

**Why a comparison prompt and not a lookup**: GPT-5 can spend a small completion
budget entirely on hidden reasoning and return an empty message. A simple lookup
can pass while that's broken; a comparison forces real output.

### 🧹 Cleanup — do not skip

Record the resource group name first, then tear down and **verify**:

```bash
azd env get-value RESOURCE_GROUP_NAME     # save this
azd down --force --purge                  # must exit successfully
az group exists --name <resource-group-name>   # must return: false
```

Do not treat `azd down` exiting as proof. `az group exists` returning `false` is
the proof. If a later redeploy fails on a soft-deleted Cognitive Services
account:

```bash
az cognitiveservices account list-deleted
az cognitiveservices account purge --name <name> --location westus --resource-group <rg>
```

---

## When something breaks on stage

Generation is non-deterministic; something will misfire eventually. Don't
improvise a fix in front of people — stay in the same session so it keeps the
context, and paste this:

```
The following command failed during <phase> on <OS and shell>:

<exact command>

Relevant error output:

<redacted error output>

Inspect the relevant application and Azure logs, explain the root cause, make the smallest safe fix, rerun the failed step, and re-run the verification. Record the issue and resolution in issues.md. Do not print secrets.
```

Paste the **exact** error, never a paraphrase — and strip tokens, connection
strings, keys, and `.env` values first. Narrate what you're doing while it
works; a recovery handled calmly is a better demo than a run that never stumbles.

---

## Known friction (rehearse these)

- **The three AI failures you'll actually hit.** *Semantic search returns
  nothing* → the index is empty, push the products. *Assistant gives generic
  answers* → the chat endpoint isn't putting the catalog in the system prompt.
  *Assistant types, then 500s* → GPT-5 burned its token budget on hidden
  reasoning; set reasoning effort to minimal, allow ≥2000 completion tokens, and
  return 502 `AI_RESPONSE_ERROR` on an empty message.
- **Products missing after deploy** → `VITE_API_URL` was built without the `/api`
  segment. Check the Network tab, then re-run `node infra/hooks/postdeploy.js`.
- **Data is ephemeral.** SQLite lives inside the API container; scale-to-zero or
  a restart wipes orders and inventory. Expected for a demo — just don't promise
  persistence on stage.
- **Model choice.** Use a frontier model for the constitution, plan, and any
  multi-file debugging — smaller models drop spec requirements and lose the
  thread between spec, API, and frontend. Focused single-file fixes are fine on
  a smaller model.
- **The deploy has a long tail.** ACR two-phase pull auth, the postdeploy hook
  that rebuilds the frontend with the real API URL, `zoneRedundant: false` in
  westus, probe `failureThreshold` capped at 10. The vendored
  `container-apps-deployment` skill and `PLAN.md` §Bicep Requirements cover these
  — keep both open.
- **Scope.** This builds an entire full-stack app and deploys it. It is a
  workshop, not a 30-minute slot. If you are tight on time, present through
  `/speckit.tasks` and show a pre-deployed environment for the finale.

---

## Tips

- **Don't read prompts aloud** — paste, then narrate the *intent*.
- Lead with the contrast: open the journey's `PLAN.md`, scroll it, and say
  *"someone wrote all 700 lines of this by hand. Watch."* Then run Step 1.
- If asked "why not just point Copilot at `PLAN.md`?" — that's the honest
  question, and the answer is governance. `PLAN.md` is one person's context.
  The constitution is a reviewable, version-controlled policy that every
  downstream phase is checked against, and the task list is derived rather than
  narrated. Same philosophy; repeatable across a team.
- Credit the source. It's an excellent journey and the scenario is theirs.
