# Agentic workflow

How we build platform-js changes with Claude Code and [Matt Pocock's skills](https://github.com/mattpocock/skills). This
is the supported flow for this repo. It replaces the skills' own default flow (grill → spec → tickets → implement): we
never write a separate spec, and every change is one ticket.

Setup (plugins, permissions, skills): [`docs/ClaudeCode.md`](ClaudeCode.md). Branch names, commands and tests:
[`DEV_GUIDE.md`](../DEV_GUIDE.md).

## Rules that apply on every path

- **You approve every outward step.** Before any commit, push, PR, issue edit or comment, Claude shows the diff and the
  exact content and waits for your explicit "yes".
- **Test first, always.** Every behaviour change goes through the `test-first` skill: the test is written, seen failing
  for the right reason, and reviewed by you before any implementation. A failing test is never weakened.
- **One issue holds the plan.** Grill outcomes are written into the issue **body**, not added as comments, so the body
  is always the current plan. Body edits are shown as a diff first.
- **One change, one ticket.** If a change needs more than one ticket, split the idea into separate changes instead.
- **Issues and PRs** follow [`docs/agents/issue-tracker.md`](agents/issue-tracker.md) (plain `#123` links, no closing
  keywords, closed by hand after QA), with only the org labels in
  [`docs/agents/triage-labels.md`](agents/triage-labels.md). Never `ready-for-agent` or `ready-for-human`.

## Pick your path

```mermaid
flowchart TD
  START(["Work to do"]) --> HAS{"Is there an issue?"}
  HAS -->|no, just an idea| C1
  HAS -->|yes| READY{"One ticket's worth,<br/>nothing left to decide?"}
  READY -->|yes| A1
  READY -->|"no, or unsure"| B1

  subgraph A ["Path A: ready issue"]
    A1["Create worktree<br/>type/issue-short-desc"]
  end

  subgraph B ["Path B: issue with open questions"]
    B1["Create worktree<br/>type/issue-short-desc"] --> B2["/grill-with-docs<br/>settles questions,<br/>writes GLOSSARY.md + ADRs"]
    B2 --> B3["Commit glossary + ADRs<br/>on the branch"]
    B3 --> B4["Write the outcome into<br/>the issue body<br/>(diff shown, you approve)"]
  end

  subgraph C ["Path C: idea, no issue yet"]
    C1["Create worktree<br/>type/short-desc"] --> C2["/grill-with-docs<br/>settles questions,<br/>writes GLOSSARY.md + ADRs"]
    C2 --> C3["Commit glossary + ADRs<br/>on the branch"]
    C3 -->|"same session,<br/>no /clear"| C4["/to-tickets<br/>exactly one ticket,<br/>no ready-for-agent label"]
  end

  A1 --> IMPL
  B4 -->|/clear| IMPL
  C4 -->|/clear| IMPL
  IMPL["/implement #issue<br/>(see: Inside /implement)"] --> PR["Open the PR<br/>(see: From PR to done)"]
```

When unsure whether an issue is ready, take Path B: a short grill costs less than building the wrong thing.

### Path A: ready issue

The issue already says what to build, with acceptance criteria and nothing left to decide.

1. Create the worktree, named `<type>/<issue>-<short-description>`: `wt switch --create chore/123-short-desc --no-cd`,
   or `git worktree add ../platform-js.chore-123-short-desc -b chore/123-short-desc`.
2. Start Claude in the worktree and run `/implement #123`.

### Path B: issue with open questions

1. Create the worktree as in Path A.
2. Run `/grill-with-docs` and point it at the issue. It interviews you until every question is settled, and writes new
   terms to `GLOSSARY.md` and decisions to `docs/decisions/` as ADRs (format:
   [`docs/agents/domain.md`](agents/domain.md)).
3. Commit the glossary and ADRs on the branch (`docs: ...`).
4. Ask Claude to write the outcome into the issue body: the settled decisions (one line each, linking any ADR),
   acceptance criteria, and out of scope. Claude shows the old and new body as a diff, and edits it only after your yes.
   No comments.
5. `/clear`, then `/implement #123`. The issue body now holds everything the grill settled.

### Path C: idea, no issue yet

1. Create the worktree, named `<type>/<short-description>` (no issue number yet). Keep this branch name to the end.
2. Run `/grill-with-docs` with the idea. Commit the glossary and ADRs as in Path B.
3. In the **same session** (`/to-tickets` reads the conversation, so don't `/clear` first), run `/to-tickets`. When it
   shows its breakdown, make it **one** ticket, and tell it not to apply `ready-for-agent`. It creates the issue in the
   issue form's shape (title prefix, Issue Type, labels including `bot:ai-assisted`, form sections; see
   [`docs/agents/issue-tracker.md`](agents/issue-tracker.md)).
4. `/clear`, then `/implement #<new issue>`.

## Inside `/implement`

`/implement #123` fetches the issue, builds it test-first, reviews its own work, and commits. Our `test-first` skill
wraps the `tdd` step that `/implement` calls, so each behaviour stops at the gate for your review.

```mermaid
flowchart TD
  F["/implement #123<br/>fetches the issue, states its title"] --> NEXT{"Next behaviour<br/>from the acceptance criteria"}
  NEXT --> T["Write the test<br/>(test-first skill);<br/>stub any new export"]
  T --> RED{"Fails on an assertion,<br/>no type errors?"}
  RED -->|"no: type error, bad import"| T
  RED -->|yes| GATE["GATE: you review<br/>the failing test;<br/>its version is recorded"]
  GATE -->|changes asked| T
  GATE -->|approved| IMPL["Write the minimum code<br/>to pass"]
  IMPL --> GREEN{"Package tests and<br/>type-check green?"}
  GREEN -->|"no, and the test<br/>can't pass as written"| ESC["Stop: present the gap.<br/>Never weaken the test"]
  GREEN -->|no| IMPL
  GREEN -->|yes| SAME{"Test unchanged<br/>since the gate?"}
  SAME -->|"no: back to review"| GATE
  SAME -->|yes| MORE{"More behaviours?"}
  MORE -->|yes| NEXT
  MORE -->|no| CHECK["Type-check, yarn lint,<br/>full yarn test<br/>(once, at the end)"]
  CHECK --> CR["/mattpocock-skills:code-review<br/>refactor on green tests;<br/>findings fixed test-first"]
  CR --> COMMIT["Commit on the branch<br/>(diff shown, you approve)"]
```

- The type-check command is in [`CLAUDE.md` → Build Commands](../CLAUDE.md#build-commands). It must show no errors, and
  CI fails a PR on any type error ([`DEV_GUIDE.md` → Continuous integration](../DEV_GUIDE.md#continuous-integration)).
- Because of the gate, `/implement` is not run unattended.

## From PR to done

```mermaid
flowchart TD
  P["Push the branch and open the PR<br/>.github PR template, bot:ai-assisted,<br/>plain #123, no closing keywords"] --> REV["Review"]
  REV -->|comments| FIX["Each finding: one test-first cycle<br/>(.claude/rules/code-review.md)"]
  FIX --> REV
  REV -->|approved| MERGE["A maintainer merges"]
  MERGE --> QA["QA"]
  QA --> CLOSE["Close the issue by hand"]
  CLOSE --> CLEAN["Clean up: remove the worktree,<br/>move .scratch notes to .scratch/archive/"]
```

## Which skills we use

| Skill                                         | Used?    | For                                                                         |
| --------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `/grill-with-docs`                            | Yes      | Paths B and C: settle open questions; writes `GLOSSARY.md` and ADRs         |
| `/to-tickets`                                 | Yes      | Path C only: turn a grilled idea into one issue                             |
| `/implement`                                  | Yes      | Every path: build one issue                                                 |
| `test-first` (this repo)                      | Yes      | Every behaviour change; wraps Matt's `tdd`                                  |
| `/mattpocock-skills:code-review`              | Yes      | Called by `/implement`; also on demand for a branch                         |
| `/triage`                                     | Yes      | Triage incoming issues, with the labels in `docs/agents/triage-labels.md`   |
| `/diagnosing-bugs`, `/prototype`, `/research` | Optional | Before a grill, when a bug or design question needs evidence first          |
| `/to-spec`                                    | No       | We never write a separate spec; the issue body is the spec                  |
| `/implement-spec`                             | No       | Runs tickets unattended through subagents, which the test-first gate blocks |
| `/wayfinder`                                  | No       | Its `wayfinder:*` labels don't exist on this repo                           |
