# Lab 1 — Legacy VM with Spec Kit and AVM

## Learning objective

Learn the
[official Spec Kit full path](https://github.github.com/spec-kit/quickstart.html)
using one continuous Azure infrastructure story:

```text
CONSTITUTION → SPECIFY → CLARIFY → PLAN → CHECKLIST
             → TASKS → ANALYZE → IMPLEMENT → CONVERGE
```

AVM is introduced during planning as the Azure implementation vocabulary. The
main subject remains Spec-Driven Development: keeping intent, design, work, and
implementation traceable while moving through the complete Spec Kit process.

## Story

**The Legacy VM That Never Needed a Public IP**

A team must retain a legacy Windows application in Azure without exposing RDP,
mishandling credentials, or omitting operational evidence.

## Run the demos

1. [Demo 1 — From Prompt to Durable Specification](demo-1-durable-specification.md)
   establishes the constitution, specification, clarification answers, and
   acceptance criteria.
2. [Demo 2 — From Specification to Governed AVM Infrastructure](legacy-vm-avm.md)
   continues through planning, checklist review, tasks, analysis, implementation,
   convergence, and infrastructure validation.

The demos are one continuous story. Demo 1 deliberately stops before selecting
technology; Demo 2 introduces AVM as the implementation vocabulary.

## Infrastructure

Prepared legacy-VM Terraform belongs in the repository's root
[`infra/`](../../infra/) directory because this is the current presentation
demo. The AIMarket reference remains separate under
[`../03-aimarket/infra/`](../03-aimarket/infra/).

The lab is adapted from Microsoft's
[experimental AVM Spec Kit example](https://azure.github.io/Azure-Verified-Modules/experimental/ai-assisted-sol-dev/spec-kit/avm-example/).
