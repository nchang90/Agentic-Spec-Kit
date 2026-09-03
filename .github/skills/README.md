# Vendored skills

These skills are copied unmodified from
[DanWahlin/github-azure-agentic-journeys](https://github.com/DanWahlin/github-azure-agentic-journeys)
(`.github/skills/`), MIT licensed — see `UPSTREAM-LICENSE`.

| Skill | What it carries |
|---|---|
| `container-apps-deployment` | Container Apps zone redundancy, `azure.yaml` structure, managed-identity ACR pulls, the `VITE_API_URL` postdeploy hook, nginx SPA routing, ARM64→AMD64 builds |
| `data-access-abstraction` | Repository pattern + `DATA_PROVIDER` factory in TypeScript, Python, .NET, and Java; SQLite / Cosmos DB / PostgreSQL implementations |

They supply the **how** — Azure specifics an agent otherwise guesses at.
spec-kit supplies the **what and in what order**. `/speckit.plan` and
`/speckit.implement` reference them by name (see `DEMO.md`).

To refresh:

```bash
B=https://raw.githubusercontent.com/DanWahlin/github-azure-agentic-journeys/main/.github/skills
curl -sfL "$B/container-apps-deployment/SKILL.md" -o .github/skills/container-apps-deployment/SKILL.md
curl -sfL "$B/data-access-abstraction/SKILL.md"   -o .github/skills/data-access-abstraction/SKILL.md
```
