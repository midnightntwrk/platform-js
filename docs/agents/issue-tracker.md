# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `midnightntwrk/platform-js`. Use the `gh` CLI for all
operations.

## Org rules that apply to every issue

- **AI disclosure**: every issue an agent creates carries the `bot:ai-assisted` label (`--label bot:ai-assisted`).
- **Issue Type, not a label**: set the native Issue Type (`--type Task`, `--type Bug` or `--type Feature`). Never apply
  `bug`, `enhancement`, `task` or `chore` labels.
- **Priority is a native field**, not a label. Never create or apply `priority:*` labels.
- **No new labels**: labels are managed by IaC. Use only labels that already exist on the repo (`gh label list`). If a
  skill wants a label that doesn't exist, stop and ask; a missing label is a request to SRE, not a `gh label create`.
- **No closing keywords**: link issues with a plain `#123`, never `Closes`/`Fixes`/`Resolves`. Issues are closed by hand
  after QA.

## Conventions

- **Create an issue**: `gh issue create --title "..." --type Task --label bot:ai-assisted --body "..."`. Use a heredoc
  for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
  with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or
  `gh issue edit <parent> --add-sub-issue <child>` afterwards.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with
  `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>`. Where dependencies
  aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked
  when every blocker is closed.
- **Count open blockers**: `gh api repos/midnightntwrk/platform-js/issues/<n> --jq .issue_dependencies_summary.blocked_by`
  (open blockers only; 0 means startable).
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: post the explanation with `gh issue comment <number> --body "..."`, then `gh issue close <number>`. On an
  already-closed issue, `gh issue close --comment` drops the comment and still exits 0.

`gh` infers the repo from `git remote -v` inside a clone. Before the first `gh issue create` of a session, check the
target with `gh repo view --json nameWithOwner` (it must print `midnightntwrk/platform-js`). Never file into
`mattpocock/skills`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads
this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number>`, then `gh pr view <number> --comments`, and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and
fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue, following the org rules above.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

`/wayfinder` uses `wayfinder:map` and `wayfinder:<type>` labels. They don't exist on this repo and can't be created
here (see **No new labels**), so don't run `/wayfinder` until SRE has added them.
