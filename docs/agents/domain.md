# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/decisions/`**: read ADRs that touch the area you're about to work in. `docs/decisions/index.md` lists them.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.
The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily
when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── GLOSSARY.md
├── docs/decisions/
│   ├── index.md
│   ├── template.md
│   ├── 0000-use-markdown-architectural-decision-records.md
│   └── 0001-<short-title>.md
└── packages/
    └── platform-js/
```

## Writing an ADR

This repo overrides the skills' defaults: ADRs live in `docs/decisions/`, not `docs/adr/`, and use the MADR format, not
the skills' minimal one. See [ADR-0000](../decisions/0000-use-markdown-architectural-decision-records.md).

- Copy `docs/decisions/template.md` to `docs/decisions/NNNN-<short-title>.md`, using the next free four-digit number.
- Fill in at least the title, Status, Date, Context and Problem Statement, Considered Options and Decision Outcome. The
  sections marked optional can be dropped.
- Add a line for it to `docs/decisions/index.md`.
- To replace a decision, write a new ADR and set the old one's Status to `superseded by [ADR-NNNN](NNNN-....md)`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the
term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't
use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding: name the ADR and
say why it is worth reopening.
