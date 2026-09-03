# Spec-Kit Development Guidelines

## Purpose

This repo demonstrates spec-driven development with **spec-kit**, building
**AIMarket** — a marketplace API + React storefront with semantic search and an
AI shopping assistant, deployed to Azure Container Apps with `azd`.

Scenario adapted from
[DanWahlin/github-azure-agentic-journeys → journeys/aimarket](https://github.com/DanWahlin/github-azure-agentic-journeys/tree/main/journeys/aimarket).
The demo script is `DEMO.md`.

## Active Technologies

- API: Node.js + TypeScript + Express, `better-sqlite3` (local), repository
  pattern behind a `DATA_PROVIDER` factory
- Frontend: React 18 + Vite + Tailwind CSS
- AI: Azure AI Search (Basic SKU, semantic ranker) + Microsoft Foundry
  (`gpt-5-mini`, fallback `gpt-5.4-mini`)
- Infrastructure: Bicep with Azure Verified Modules (`br/public:avm/...`),
  deployed via `azd` to Azure Container Apps
- Region: `westus`

## Commands

```bash
npm run dev                  # API on :3000, storefront on :5173
azd up                       # provision + deploy to Azure
azd down --force --purge     # tear down — always run after a demo
```

## Code Style

- TypeScript: standard conventions; routes use repository contracts only and never
  import database clients directly. Select the provider through `DATA_PROVIDER`,
  defaulting to SQLite.
- Data integrity: validate all client input on the server; store and calculate money
  as integer cents; validate referenced entities before writes.
- AI: use only catalog data supplied to the request; never invent products. Return a
  safe fallback or explicit AI-unavailable response without blocking core catalog and
  ordering flows.
- Bicep: use declarative Bicep with pinned AVM modules where available; prefer
  managed identity and never commit or print secrets.
- Delivery: build release container images in Azure, run build/IaC/preflight
  validation before deployment, and target `westus`.

<!-- MANUAL ADDITIONS START -->

## Skills

Consult `.github/skills/` before generating code or infrastructure:

- `data-access-abstraction` — repository pattern and the `DATA_PROVIDER` factory
- `container-apps-deployment` — `azure.yaml`, zone redundancy, managed-identity
  ACR pulls, the `VITE_API_URL` postdeploy hook, SPA nginx routing
<!-- MANUAL ADDITIONS END -->
