# Issue tracker: GitHub

Issues for this repo live as GitHub issues in `midnightntwrk/platform-js`. Use the `gh` CLI for all operations.

## Org rules that apply to every issue

- **AI disclosure**: every issue an agent creates carries the `bot:ai-assisted` label (`--label bot:ai-assisted`).
- **Issue Type, not a label**: set the native Issue Type (`--type Task`, `--type Bug` or `--type Feature`). Never apply
  `bug`, `enhancement`, `task` or `chore` labels.
- **Priority is a native field**, not a label. Never create or apply `priority:*` labels.
- **No new labels**: labels are managed by IaC. Use only labels that already exist on the repo (`gh label list`). If a
  skill wants a label that doesn't exist, stop and ask; a missing label is a request to SRE, not a `gh label create`.
- **No closing keywords**: link issues with a plain `#123`, never `Closes`/`Fixes`/`Resolves`. Issues are closed by hand
  after QA.
- **No checkboxes**: write acceptance criteria, tasks and every other list in an issue body as plain `-` bullets, never
  `- [ ]`, as midnight-wallet does. Nobody ticks them, so they only show as unfinished work. This overrides the `- [ ]`
  template in Matt's `/to-tickets` skill.

## Conventions

- **Create an issue**: `gh issue create` skips the issue forms in `.github/ISSUE_TEMPLATE/`, so do by hand what the form
  does: its title prefix, Issue Type and labels (below), plus `bot:ai-assisted`, and its fields as `###` headings in the
  body.

  | Form                            | Title prefix | Issue Type | Labels                                                       |
  | ------------------------------- | ------------ | ---------- | ------------------------------------------------------------ |
  | `task.yml`                      | `[Task] `    | `Task`     | `status:untriaged`, `component:platform-js`                  |
  | `feature-request.yml`           | `[Feature] ` | `Feature`  | `status:untriaged`, `component:platform-js`                  |
  | `bug-report.yml`                | `[Bug] `     | `Bug`      | `status:untriaged`, `component:platform-js`                  |
  | `documentation-improvement.yml` | `[Docs] `    | `Task`     | `status:untriaged`, `documentation`, `component:platform-js` |

  For a Task:
  `gh issue create --title "[Task] ..." --type Task --label status:untriaged,component:platform-js,bot:ai-assisted --body "..."`,
  with `### Summary`, `### Acceptance criteria / done when` and `### Context / notes`. Use a heredoc for multi-line
  bodies.

- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**:
  `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
  with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or
  `gh issue edit <parent> --add-sub-issue <child>` afterwards.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with
  `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>`. Where dependencies
  aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked
  when every blocker is closed.
- **Count open blockers**:
  `gh api repos/midnightntwrk/platform-js/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers only; 0
  means startable).
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: post the explanation with `gh issue comment <number> --body "..."`, then `gh issue close <number>`. On an
  already-closed issue, `gh issue close --comment` drops the comment and still exits 0.

`gh` infers the repo from `git remote -v` inside a clone. Before the first `gh issue create` of a session, check the
target with `gh repo view --json nameWithOwner` (it must print `midnightntwrk/platform-js`). Never file into
`mattpocock/skills`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads
this flag.)_ If it is ever set to `yes`, PRs use the same labels as issues, through the `gh pr` equivalents.

## When a skill says "publish to the issue tracker"

Create a GitHub issue, following the org rules above.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

`/wayfinder` uses `wayfinder:map` and `wayfinder:<type>` labels. They don't exist on this repo and can't be created here
(see **No new labels**), so don't run `/wayfinder` until SRE has added them.
