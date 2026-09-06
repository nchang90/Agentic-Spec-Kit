# Lab 0 — Learn Spec Kit in 30 minutes

**Audience**: attendees of *Deploying Azure Infrastructure using AVM and
Spec-Driven Development*, before the AVM demo starts.

**Why this lab exists.** The main demo deploys real Azure infrastructure and
costs real money. That is a bad place to learn what `/speckit-plan` does. This
lab teaches the whole Spec-Driven Development loop on a small local CLI —
**no Azure, no keys, no cost, nothing to tear down** — so that when the AVM demo
starts, the only new thing on screen is the infrastructure.

You will build **azcost**: a CLI that reads a list of Azure resources from a JSON
file and prints an estimated monthly cost. It is deliberately small. The point is
the *process*, not the program.

---

## What Spec Kit actually is

Spec Kit is a set of slash commands for your coding agent plus a directory of
templates and shell scripts. It does not run your code and it is not a build
tool. It produces **markdown artifacts in a fixed order**, each one derived from
the last:

| Command | Produces | Lands in |
|---|---|---|
| `/speckit-constitution` | Standing rules for the project | `.specify/memory/constitution.md` |
| `/speckit-specify` | The *what* and *why*, no technology | `specs/<NNN-slug>/spec.md` |
| `/speckit-clarify` | Answers to ambiguities in the spec | edits `spec.md` |
| `/speckit-plan` | The *how* — technology, structure | `specs/<NNN-slug>/plan.md` (+ `research.md`, `data-model.md`, `contracts/`, `quickstart.md`) |
| `/speckit-checklist` | Quality criteria to gate on | `specs/<NNN-slug>/checklists/` |
| `/speckit-tasks` | Dependency-ordered work breakdown | `specs/<NNN-slug>/tasks.md` |
| `/speckit-analyze` | Conflicts and gaps across the three | report in chat |
| `/speckit-implement` | The actual code | your source tree |
| `/speckit-converge` | Checks code against the spec, appends missed work | appends to `tasks.md` |

Three things surprise people, so read them twice:

1. **The feature directory is auto-numbered from your description.** Ask for
   "an azure cost estimator cli" and you get branch `001-azure-cost-estimator-cli`
   and directory `specs/001-azure-cost-estimator-cli/`. You do **not** choose the
   number, and asking for a name like `01-azcost` will not produce that directory.
2. **`specs/` holds documents, not your application.** `/speckit-implement`
   writes code into the repository proper. Do not go looking for `package.json`
   under `specs/`.
3. **The active feature is tracked in `.specify/feature.json`**, not inferred
   from your branch name. That file is machine-local and gitignored, so it is
   per-checkout state — which is why you can run the commands without being on a
   feature branch, and why a fresh clone has no active feature until you run
   `/speckit-specify`.

### How the commands are wired

Each command is one **skill**: a folder under `.github/skills/` containing a
single `SKILL.md`. Open `.github/skills/speckit-specify/SKILL.md` — that file
*is* the command. There is no separate registration step and no pointer file;
the folder name is the slash command.

```
.github/skills/
├── speckit-constitution/SKILL.md
├── speckit-specify/SKILL.md
├── speckit-plan/SKILL.md
...
├── container-apps-deployment/SKILL.md   ← not a command; reference material
└── data-access-abstraction/SKILL.md     ← the agent reads these when planning
```

Note the last two. Skills are not only commands — they are also how you give the
agent **durable know-how**. Those two carry the Azure gotchas the main demo
depends on, which is why its deployment prompt can be four lines long. When your
team learns a new gotcha, it goes in a skill, not in an ever-longer prompt.

> **Note on the separator.** Commands are invoked with a **hyphen**:
> `/speckit-specify`. Older Spec Kit projects used a *commands* layout with
> `.github/agents/*.agent.md` plus `.github/prompts/*.prompt.md` pointer files
> and a **dot**: `/speckit.specify`. If you find a blog post or recording using
> the dot form, it predates Spec Kit 1.0. Same commands, different layout — a
> fresh `specify init .` today gives you the hyphen form you see here.

---

## Before you start

```bash
node --version          # any LTS
specify version         # Spec Kit CLI
git status --short      # should be clean
```

You need VS Code with GitHub Copilot Chat signed in. You do **not** need an Azure
subscription, `az`, or Terraform for this lab.

Work on a scratch branch so cleanup is trivial:

```bash
git switch -c lab-speckit-basics
```

---

## Step 1 — Write the constitution

The constitution is standing policy for the whole project. It is not a feature
description. The rules that earn their place are the ones you can *check*.

```
/speckit-constitution Define the standing engineering rules for a small
offline command-line tool.

Correctness: money is stored and calculated in integer cents, never floating
point. Costs are rounded once, at output.

Determinism: the same input file MUST always produce byte-identical output. No
timestamps, no random ordering, no locale-dependent formatting.

Offline: the tool MUST NOT make network calls at runtime. Pricing is a checked-in
data table, and the table's source and retrieval date are recorded alongside it.

Failing closed: an unknown resource type or SKU MUST cause a non-zero exit and a
message naming the offending entry. It MUST NOT be silently priced at zero.

Testing: every rule above has an automated test that fails when the rule is
broken.
```

**Look at what you got.** Open `.specify/memory/constitution.md`. Note the Sync
Impact Report comment at the top and the version number at the bottom. This file
is version-controlled policy — that is the entire pitch of Spec-Driven
Development, and everything downstream gets checked against it.

> ⚠️ `/speckit-constitution` **edits the shared file in place.** This repo ships
> an Azure platform constitution for its infrastructure baseline. You are on a
> scratch branch, so `git restore` at the end puts it back — but do not skip the
> cleanup step.

---

## Step 2 — Specify the *what*

Deliberately no technology. No language, no libraries, no file formats beyond
what the user actually sees.

```
/speckit-specify Build azcost, a command-line tool that estimates the monthly
cost of a set of Azure resources.

Input: a JSON file listing resources, each with a type, a SKU, a region, and a
quantity. Output: a table of per-resource monthly cost plus a total, printed to
standard output.

Supported resource types: container app, container registry, AI search service,
log analytics workspace, and cognitive services account. Each has at least one
SKU with a known monthly price.

Behaviour: a resource with an unrecognised type or SKU stops the run and reports
which entry was bad. A --json flag emits the same figures as machine-readable
JSON instead of a table. An empty resource list prints a zero total rather than
failing.

Acceptance criteria: a sample file with one AI Search Basic, two container apps
and one registry produces a total matching a hand-checked figure; the same file
run twice produces identical bytes; a file with SKU "Nonexistent" exits non-zero
and names that entry; --json output parses and its total equals the table total.
```

Open `specs/001-*/spec.md`. Notice it contains user-facing behaviour and
acceptance criteria — and no mention of Node, Python, or any library.

**Optional but a good beat:**

```
/speckit-clarify
```

Watch which ambiguities it surfaces. Every question it asks is one you would
otherwise have discovered halfway through implementation.

---

## Step 3 — Plan the *how*

Now, and only now, technology.

```
/speckit-plan Implement azcost in Node.js with TypeScript, run through a single
bin entry point. No runtime dependencies beyond the Node standard library;
dev dependencies for the test runner only. Use the built-in node:test runner.

Store the pricing table as a checked-in JSON file with a header block recording
its source URL and retrieval date. Represent all money as integer cents in a
branded type so that a float cannot be assigned to it by accident.

Structure: a pure pricing module that takes parsed input and returns results, a
thin CLI wrapper that handles argv and process exit codes, and a loader that
validates the input file. All business logic must be testable without spawning a
process.
```

Now open the generated `plan.md` and find the constitution check section. **This
is the moment worth pausing on**: the plan explicitly records how it satisfies the
integer-cents rule, the determinism rule, and the offline rule. Nobody typed
those into the plan prompt. They propagated from Step 1.

---

## Step 4 — See governance actually catch something

This is the most valuable 60 seconds in the lab. Ask for something that violates
the constitution:

```
/speckit-specify Add a --live flag that fetches current prices from the Azure
Retail Prices API instead of using the local table.
```

Then run:

```
/speckit-analyze
```

It should flag the conflict with the offline rule and the determinism rule from
Step 1. **Read the finding aloud.** The tool did not refuse to think about the
feature — it told you which standing rule the feature breaks, so a human can
decide whether to change the feature or amend the constitution.

That is the difference between a prompt and a governed process, and it is the
whole reason the AVM demo can trust its generated infrastructure.

> Discard this experiment before continuing by restoring the generated feature
> directory from the previous commit, or amend the constitution deliberately if
> you would rather show that path.

---

## Step 5 — Tasks

```
/speckit-tasks
```

Open `tasks.md`. Note that tasks are **ordered by dependency** and each carries
acceptance criteria traceable back to the spec. Nobody sequenced this by hand.

**Optional:**

```
/speckit-checklist
```

---

## Step 6 — Implement

```
/speckit-implement
```

Then run it for real:

```bash
npm install
npm test
node bin/azcost.js examples/sample.json
node bin/azcost.js examples/sample.json --json
```

Check the rules yourself:

```bash
# determinism — must print nothing
diff <(node bin/azcost.js examples/sample.json) \
     <(node bin/azcost.js examples/sample.json)

# fails closed — must be non-zero and name the entry
node bin/azcost.js examples/bad-sku.json; echo "exit=$?"

# offline — no network imports in the pricing path
grep -rn "https\?://" src/ --include=*.ts | grep -v "source" || echo "no runtime URLs"
```

If `examples/bad-sku.json` does not exist, that is itself a finding — the spec
called for that behaviour. Which brings us to the last command.

---

## Step 7 — Converge

```
/speckit-converge
```

This is the step most people never reach and the one that closes the loop. It
reads the codebase back against the spec, plan and tasks, and **appends whatever
is still missing to `tasks.md`** as new tasks. Then:

```
/speckit-implement
```

picks up exactly that gap list. Run `npm test` again.

---

## What to take away

- The **constitution** is written once and enforced at every later step. You saw
  it appear in `plan.md` without being retyped, and you saw `/speckit-analyze`
  refuse to let a feature quietly break it.
- The **spec has no technology in it** and the **plan has nothing else**. Keeping
  that boundary is what makes the spec survive a change of stack.
- **Tasks are derived, not narrated.** That is what makes them safe to delegate —
  to a teammate, or to the Copilot coding agent via `/speckit-taskstoissues`.
- **`/speckit-converge` is the receipt.** Generated code that nobody checked back
  against the spec is just fast typing.

Everything you just did on a 200-line CLI is what the main demo does to a
Terraform AVM deployment. The loop does not change. Only the blast radius does.

---

## Cleanup

Nothing was deployed, so there is nothing to bill. First inspect the exact
generated paths, then remove only those paths:

```bash
printf '%s\n' specs/001-azure-cost-estimator-cli src tests bin examples \
  package.json package-lock.json tsconfig.json
git switch main
git branch -D lab-speckit-basics
rm -rf specs/001-azure-cost-estimator-cli src tests bin examples
rm -f package.json package-lock.json tsconfig.json
git restore .specify/memory/constitution.md   # restore the platform constitution
```

Confirm the main demo is intact before you present it:

```bash
git status --short
ls .github/skills/ | grep -c speckit-         # 10 command skills
```
