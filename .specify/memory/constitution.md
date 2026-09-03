<!--
Sync Impact Report
- Version change: unversioned template -> 1.0.0 (initial concrete adoption).
- Modified principles: template placeholders -> I. Storage Abstraction and Provider
  Portability; II. Server-Side Data Integrity; III. Catalog-Grounded Resilient AI;
  IV. Declarative, Secure Azure Infrastructure; V. Validated Azure Delivery.
- Added sections: Architecture Constraints; Delivery and Quality Gates.
- Removed sections: none.
- Templates requiring updates:
  - ✅ updated `.specify/templates/plan-template.md`
  - ✅ updated `.specify/templates/spec-template.md`
  - ✅ updated `.specify/templates/tasks-template.md`
  - ✅ updated `.github/copilot-instructions.md`
  - ✅ updated `DEMO.md`
  - ✅ updated `.github/agents/speckit.constitution.agent.md` to retain
    agent-neutral command-document guidance.
  - ✅ reviewed `.github/prompts/speckit.*.prompt.md`; these routing-only command
    documents require no change.
  - ✅ reviewed `.specify/templates/commands/`; the directory is absent, so there
    are no command documents to update.
- Follow-up TODOs: none.
-->
# AIMarket Constitution

## Core Principles

### I. Storage Abstraction and Provider Portability

API routes MUST access persistence only through repository contracts. A
`DATA_PROVIDER`-selected composition layer MUST provide those contracts, and SQLite
MUST be the default provider. Changing a storage provider MUST NOT require changes
to routes or their API contracts. This isolates delivery and storage decisions from
the public API and makes provider substitutions verifiable by contract tests.

### II. Server-Side Data Integrity

The server MUST validate every client-supplied value before it is used or persisted;
client-side validation is advisory only. Monetary amounts MUST be stored and
calculated as integer cents, and the server MUST derive authoritative prices and
totals. Before a write creates or updates a relationship, the server MUST verify
that each referenced entity exists and satisfies the operation's rules. These rules
prevent invalid state, rounding errors, and tampered requests.

### III. Catalog-Grounded Resilient AI

AI features MUST use only catalog data supplied to the request; they MUST NOT invent
products, inventory, prices, or product attributes. If an AI dependency is
unavailable, malformed, or returns an empty result, the application MUST return a
safe fallback or an explicit AI-unavailable response while core catalog and ordering
flows remain usable. This keeps recommendations trustworthy and makes AI outages
non-blocking.

### IV. Declarative, Secure Azure Infrastructure

Azure infrastructure MUST be declared in Bicep. Implementations MUST use pinned
Azure Verified Modules (AVM) when an applicable module is available; a raw Azure
resource requires a documented reason that AVM cannot meet the requirement. Managed
identity MUST be preferred for Azure service-to-service authentication. Secrets,
keys, tokens, and credentials MUST never be committed to source-controlled files or
printed by application or deployment code. These constraints make infrastructure
reviewable and minimize credential exposure.

### V. Validated Azure Delivery

Container images MUST be built by an Azure-managed build service, not by the
developer workstation for release deployment. Every deployment MUST validate the
application build and infrastructure before applying changes. Azure resources for
this application MUST target West US (`westus`). These gates provide repeatable
releases in the supported operating region.

## Architecture Constraints

- Route handlers MUST depend on repository interfaces, never database clients,
  provider-specific query builders, or provider-specific models.
- The provider-selection boundary MUST be configured from `DATA_PROVIDER`, default
  to SQLite when it is unset, and fail clearly for unsupported providers.
- Repository contract tests MUST run against SQLite and every additional supported
  provider before that provider can be enabled for an environment.
- Feature designs that accept money, client input, entity references, or AI output
  MUST state their validation and failure behavior in executable acceptance tests.

## Delivery and Quality Gates

- Feature specifications MUST identify the applicable repository, data-integrity,
  AI, infrastructure, and delivery constraints as testable requirements.
- Implementation plans MUST record the selected provider, repository contracts,
  monetary representation, AI fallback behavior where applicable, Azure resource
  identity model, AVM usage, and the `westus` deployment target.
- Task lists MUST include work to test provider portability, server validation and
  referential integrity, catalog grounding and AI degradation where applicable, and
  Bicep/deployment validation.
- A release is blocked until the container build, automated tests, Bicep validation,
  secret review, and deployment preflight have passed.

## Governance

This constitution supersedes conflicting development guidance. An amendment proposal
MUST document the changed rule, rationale, affected templates or runtime guidance,
and any migration or verification work. Maintainers MUST approve the proposal and
update the Sync Impact Report before the amendment takes effect.

Versions use semantic versioning: MAJOR for incompatible principle removals or
redefinitions, MINOR for added principles or materially expanded mandatory guidance,
and PATCH for clarifications or non-semantic refinements. Every plan, specification,
task list, code review, and deployment review MUST verify applicable constitutional
requirements; unresolved violations block approval unless the constitution is
formally amended first.

**Version**: 1.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
