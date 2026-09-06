# Skills

`.github/skills/` holds two different kinds of skill:

- **`speckit-*/`** — the Spec Kit commands themselves, installed and managed by
  the Specify CLI. Each folder's `SKILL.md` is the slash command
  (`/speckit-specify`, `/speckit-plan`, …). Do not hand-edit these; they are
  overwritten by `specify integration upgrade`.
- **Everything else** — reference skills the agent reads while planning and
  implementing. These are yours to edit and are described below.

## Reference skills

The application skills are adapted from
[DanWahlin/github-azure-agentic-journeys](https://github.com/DanWahlin/github-azure-agentic-journeys)
(`.github/skills/`), MIT licensed; see each skill's upstream notice where
applicable. `avm-terraform` is maintained in this repository for the platform
demo.

| Skill | What it carries |
|---|---|
| `avm-terraform` | AVM module discovery, exact pins, shared interfaces, provider requirements, and teardown-safe configuration |
| `container-apps-deployment` | Container Apps zone redundancy, `azure.yaml` structure, managed-identity ACR pulls, the `VITE_API_URL` postdeploy hook, nginx SPA routing, ARM64→AMD64 builds |
| `data-access-abstraction` | Repository pattern + `DATA_PROVIDER` factory in TypeScript, Python, .NET, and Java; SQLite / Cosmos DB / PostgreSQL implementations |

They supply the **how** — Azure specifics an agent otherwise guesses at.
Spec Kit supplies the **what and in what order**. `/speckit-plan` and
`/speckit-implement` reference them by name; see the labs in `lab/`.

To refresh the upstream application skills:

```bash
B=https://raw.githubusercontent.com/DanWahlin/github-azure-agentic-journeys/main/.github/skills
curl -sfL "$B/container-apps-deployment/SKILL.md" -o .github/skills/container-apps-deployment/SKILL.md
curl -sfL "$B/data-access-abstraction/SKILL.md"   -o .github/skills/data-access-abstraction/SKILL.md
```
