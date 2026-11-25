# Use Markdown Architectural Decision Records

- Status: accepted
- Date: 2026-11-17

Technical Story: [#19](https://github.com/midnightntwrk/platform-js/issues/19)

## Context and Problem Statement

We want to record architectural decisions made in platform-js, and the agent skills we use (`/grill-with-docs`,
`/domain-modeling`) write ADRs as they settle decisions. Which format and structure should these records follow, and
where do they live?

## Decision Drivers

- Match midnight-wallet, so one ADR format and location works across our TypeScript repos. midnight-wallet
  (`midnightntwrk/midnight-wallet`) is the Midnight TypeScript repo whose agent setup platform-js is modelled on: its
  rules, test-first loop and ADR layout.
- Records must be plain Markdown that both people and agents can read and write.

## Considered Options

- [MADR](https://adr.github.io/madr/) 2.1.2 in `docs/decisions/`, as midnight-wallet does
- The agent skills' default: a minimal free-form ADR in `docs/adr/`
- Formless: no conventions for file format and structure

## Decision Outcome

Chosen option: "MADR 2.1.2 in `docs/decisions/`", because it matches midnight-wallet, and its structure (options,
drivers, consequences) makes the reasoning behind a decision explicit for whoever reads it later.

### Positive Consequences

- The same ADR conventions as midnight-wallet.
- Each decision records the options it rejected, not only the one it chose.

### Negative Consequences

- The agent skills default to `docs/adr/` and a minimal format, so `docs/agents/domain.md` and `CLAUDE.md` must override
  them.
