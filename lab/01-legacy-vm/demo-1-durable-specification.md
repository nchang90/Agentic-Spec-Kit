# Demo 1 — From Prompt to Durable Specification

This demo belongs immediately after the presentation's **Spec Kit Workflow**
slide and before **Azure Guardrails**.

Its learning goal is to practise the first three stages of the
[official Spec Kit full path](https://github.github.com/spec-kit/quickstart.html):
constitution, specify, and clarify. Demo 2 completes the remaining stages.

It begins the story that Demo 2 completes:

## Story: The Legacy VM That Never Needed a Public IP

A team must retain a legacy business application that runs on Windows Server
2016. Its first request to an AI coding agent sounds reasonable:

> Move our legacy application to Azure. Keep it secure and follow our normal
> standards.

The prompt could produce a working VM, but it leaves the important questions
unanswered:

- Could the VM receive a public IP?
- How will administrators connect without exposing RDP?
- Where will the administrator credential be stored?
- Must storage traffic remain private?
- Which failures need monitoring and alerts?
- How will reviewers prove that the result follows the team's rules?

The team does not improve the prompt by making it longer. It uses Spec Kit to
turn the request into a versioned delivery contract.

This scenario is adapted from Microsoft's
[experimental AVM example](https://azure.github.io/Azure-Verified-Modules/experimental/ai-assisted-sol-dev/spec-kit/avm-example/).
The Microsoft example is a reference, not a production blueprint; this demo
uses the repository's current Spec Kit commands and conventions.

## Demo outcome

By the end of Demo 1, the team has:

1. A constitution containing reusable security and delivery rules.
2. A specification describing observable workload outcomes.
3. Recorded answers to the most important ambiguities.
4. Acceptance criteria that reviewers can verify.

No infrastructure is generated or deployed in this demo. Demo 2 takes the
approved specification through planning, checklist review, tasks, analysis, AVM
implementation, convergence, and validation.

## Demo flow

| Beat | Demo action | Story |
|---|---|---|
| The unreliable prompt | Show the original one-line request | "Secure" and "normal standards" exist only in people's heads. |
| The contract | Open `.specify/memory/constitution.md` | Reusable rules become version-controlled policy. |
| The outcome | Run `/speckit-specify` and open `spec.md` | The team records what must be true without choosing modules. |
| The uncertainty | Run `/speckit-clarify` | Access, credentials, storage, and monitoring decisions become explicit. |
| The review | Read the requirements and acceptance criteria | The team can approve intent before implementation begins. |

**Opening line:**

> "A prompt can create a VM. It cannot prove that everyone agreed what secure
> meant."

**Closing line:**

> "We now have an approved definition of secure. Next, we will prove that those
> requirements control the AVM implementation."

---

## What Spec Kit actually is

Spec Kit is a structured workflow exposed through coding-agent commands,
templates, and scripts. It does not deploy Azure resources itself. It creates
durable artifacts that separate intent from implementation:

| Command | Purpose | Artifact |
|---|---|---|
| `/speckit-constitution` | Establish reusable project rules | `.specify/memory/constitution.md` |
| `/speckit-specify` | Define the outcome and acceptance criteria | `specs/<NNN-slug>/spec.md` |
| `/speckit-clarify` | Resolve important ambiguities | updates `spec.md` |
| `/speckit-plan` | Choose architecture and technology | `plan.md` and supporting design artifacts |
| `/speckit-tasks` | Derive dependency-ordered work | `tasks.md` |
| `/speckit-analyze` | Find conflicts across spec, plan, and tasks | report in chat |
| `/speckit-implement` | Build the planned solution | repository source files |
| `/speckit-converge` | Compare implementation with the contract | appends missing work to `tasks.md` |

Together, the two demos follow the official full path. Demo 1 stops after
clarification; Demo 2 continues from the approved specification.

> **Command names:** syntax depends on the coding-agent integration. Official
> material commonly shows `/speckit.specify`; this repository's Copilot skills
> expose `/speckit-specify`. The workflow is the same.

---

## Before the demo

Use VS Code with GitHub Copilot Chat signed in. Confirm that Spec Kit is
available:

```bash
specify version
git status --short
```

Use a prepared branch so the generated responses do not depend on live model
speed:

```bash
git switch demo-legacy-vm-spec
```

Keep a clean copy of the expected constitution and specification available in
another editor tab. If a live command produces substantially different wording,
explain that generated prose varies and continue with the prepared artifact.

---

## Step 1 — Show the unreliable prompt

Begin with the request the team originally considered sufficient:

```text
Move our legacy application to Azure. Keep it secure and follow our normal
standards.
```

Ask the audience what this prompt fails to decide. Reveal the unanswered
questions from the story.

**Talking point:** the problem is not that the prompt is too short. The problem
is that its hidden assumptions are not durable, reviewable, or testable.

---

## Step 2 — Establish the delivery contract

The constitution contains rules that should apply to every feature in this
project. It is not the description of this VM.

Run:

```text
/speckit-constitution Define the standing engineering rules for retained Azure
workloads.

Security: workloads must not expose administrative ports or public IP addresses.
Use private connectivity and identity-based access wherever Azure supports it.
Credentials and secrets must be generated securely and stored in Azure Key
Vault; they must never appear in source control or deployment output.

Infrastructure: define Azure resources as infrastructure as code using pinned
Azure Verified Modules. Direct resource declarations require a documented reason
when no suitable AVM module exists.

Operations: send diagnostic logs and metrics to a central Log Analytics
workspace for every resource that supports diagnostic settings. Define alerts
for critical availability, capacity, and security failures.

Delivery: validate infrastructure before deployment. Every requirement must be
traceable through the plan, tasks, implementation, and validation evidence.

Lifecycle: demo and development environments must remain reversible. Avoid
resource locks and irreversible protection settings outside production.

Location: deploy resources to westus unless an approved requirement states
otherwise.
```

Open `.specify/memory/constitution.md`.

Point out:

- The rules are version controlled.
- They apply beyond this single workload.
- Each rule can influence later planning and validation.
- The constitution governs the work, but a human still reviews and approves it.

> **Repository note:** `/speckit-constitution` edits the shared constitution in
> place. Use the prepared demo branch and do not overwrite uncommitted work.

---

## Step 3 — Specify what must be true

The specification describes outcomes, not the Azure implementation vocabulary.
Do not request AVM modules, Terraform resources, or particular resource names
here.

Run:

```text
/speckit-specify Retain a legacy business application that runs on a single
Windows Server 2016 machine with at least 2 CPU cores and 8 GB of memory.

Administrators must be able to establish an authenticated remote desktop session
without exposing the machine or its administrative ports to the public internet.

The application requires a 500 GB data disk and a shared file location using
HDD-backed storage. Traffic to the shared file location must remain on private
network paths.

The administrator credential must be generated during delivery, stored in an
approved secret store, and unavailable in source control or ordinary deployment
output.

Operators must be able to investigate machine availability, disk capacity, and
failed access to the secret store from centralized monitoring. Critical
conditions in those areas must notify the operations team.

Acceptance criteria:
- the machine has no public IP address and no internet-exposed RDP endpoint;
- an administrator can connect through an approved private access path;
- the file share resolves and connects through a private endpoint;
- the generated administrator credential is retrievable only by authorized
  identities;
- centralized monitoring receives the supported diagnostic data; and
- validation succeeds before any deployment is permitted.
```

Open the newly created `specs/<NNN-slug>/spec.md`.

Show that the specification contains:

- user scenarios;
- functional requirements;
- edge cases;
- measurable acceptance criteria; and
- no AVM source names or Terraform implementation details.

**Talking point:** Bastion, Key Vault, private DNS, and specific AVM modules may
be sensible implementation choices, but those belong in the plan shown during
Demo 2.

---

## Step 4 — Clarify before designing

Run:

```text
/speckit-clarify
```

Prioritize questions that materially affect the architecture:

- Is one VM sufficient, with no high-availability or disaster-recovery
  requirement?
- Who may initiate administrative sessions?
- What retention and notification behavior does operations require?
- Must all supporting services disable public network access?
- What evidence must be retained after validation?

Record the answers in `spec.md`. Do not resolve architectural questions by
silently adding technology to the specification.

If the command asks less useful questions, use these prepared answers:

```text
This is a retained single-instance workload. High availability, disaster
recovery, and horizontal scaling are out of scope.

Only identities in the approved administrator group may initiate remote
sessions or retrieve the administrator credential.

Supporting services must use private access where the selected Azure service
supports it. Validation output and the reviewed infrastructure plan are retained
as delivery evidence.
```

---

## Step 5 — Review the durable specification

Finish by comparing the original prompt with the approved `spec.md`.

Use this review checklist:

- Can a reviewer tell whether public RDP is forbidden?
- Is credential handling explicit?
- Is private storage connectivity testable?
- Are monitoring outcomes and critical alerts defined?
- Are high availability and disaster recovery clearly out of scope?
- Can each acceptance criterion produce evidence?

The team has not selected modules or generated infrastructure yet. That is the
point: it can review and approve the intended result before implementation
choices make change expensive.

---

## Transition to Demo 2

Return to the **Azure Guardrails**, **Reference Architecture**, and **Worked
Example** slides.

Then continue with
[Demo 2 — From Specification to Governed AVM Infrastructure](legacy-vm-avm.md):

> "The specification tells us what must be true. Now we will trace those
> requirements into private networking, protected credentials, monitoring, and
> pinned AVM modules—and validate that the implementation still matches the
> contract."

Demo 2 should distinguish two kinds of proof:

1. `/speckit-converge` checks the implementation against `spec.md`, `plan.md`,
   and `tasks.md`, then records missing work.
2. Infrastructure validation checks Terraform syntax, AVM sourcing, version
   pinning, security controls, and deployability.

Neither check replaces the other.

---

## Demo recovery

- **A command is slow:** switch to the prepared artifact and continue the story.
- **Generated wording differs:** compare outcomes rather than individual
  sentences.
- **Clarification misses an important question:** ask it explicitly and show the
  resulting update to `spec.md`.
- **The wrong feature is active:** open `.specify/feature.json` and switch to the
  prepared demo branch before continuing.

No Azure resources are deployed during Demo 1, so it creates no Azure cost and
requires no cloud cleanup.
