# Claude Code Setup

Recommended Claude Code configuration for developers working on this repository.

## Settings file scopes

Claude Code merges settings from several files. Know which one you're editing:

| File                          | Scope               | Tracked by git  | What goes here                                                    |
| ----------------------------- | ------------------- | --------------- | ----------------------------------------------------------------- |
| `.claude/settings.json`       | This repo, everyone | **Yes**         | Shared team config (plugins, attribution). **No `permissions`.** |
| `.claude/settings.local.json` | This repo, just you | No (gitignored) | Your personal repo-scoped permissions                             |
| `~/.claude/settings.json`     | All repos, just you | No              | Your personal global permissions (see below)                      |

The tracked `.claude/settings.json` must never contain a `permissions` block. Permissions are personal and belong in
one of the other two files.

## Recommended personal permissions

These are recommendations, not enforced by the repo. Put them in `~/.claude/settings.json` so they apply everywhere, or
in `.claude/settings.local.json` for this repo only.

- **Deny** stops Claude from reading secrets.
- **Ask** gates outward-facing git and GitHub actions. Prompt-based rules ("always ask before committing" in a
  CLAUDE.md) are advisory, and the agent can drift. Permission rules are mechanical: the tool call is intercepted and you
  approve or reject it every time.

```json
{
  "permissions": {
    "deny": [
      "Read(//**/.env)",
      "Read(//**/.env.*)",
      "Read(//**/secrets/**)",
      "Read(//**/*.pem)",
      "Read(//**/*.key)",
      "Read(//**/*.p12)",
      "Read(//**/id_rsa)",
      "Read(//**/id_ed25519)",
      "Read(//**/.npmrc)",
      "Read(//**/.netrc)",
      "Read(//**/.zshenv.local*)",
      "Read(//**/.zshrc.local*)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(~/.config/gcloud/**)",
      "Read(~/.gnupg/**)"
    ],
    "ask": [
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(gh pr create:*)",
      "Bash(gh pr edit:*)",
      "Bash(gh issue create:*)",
      "Bash(gh issue edit:*)",
      "Bash(gh pr comment:*)",
      "Bash(gh issue comment:*)"
    ]
  }
}
```

With these in place, commits, pushes, and creating, editing or commenting on PRs and issues always stop for your
explicit approval, whatever any CLAUDE.md says.

## Plugins (tracked, apply to everyone)

The tracked `.claude/settings.json` does three things:

- Registers two plugin marketplaces (`extraKnownMarketplaces`):
  - `mattpocock` → GitHub `mattpocock/skills`
  - `shieldedtech` → GitHub `shieldedtech/agent-rules`
- Enables two plugins (`enabledPlugins`):
  - `mattpocock-skills@mattpocock`: Matt Pocock's engineering skills (`/implement`, `/grill-with-docs`, `/to-tickets`,
    `tdd`, `code-review`, and others).
  - `shielded-core-rules@shieldedtech`: the mandatory Shielded engineering rules.
- Blanks `attribution`, per the org rule on AI-assistance disclosure.

Versions are not pinned. You get whatever the marketplace serves when you install. To update, use `/plugin` inside
Claude Code, or `claude plugin update <plugin>` from a shell.

When you first trust the folder, Claude Code offers to install the marketplaces and plugins. Accept, and they load in
every later session.

> **If the plugins' skills don't show up** (type `/mattpocock-skills` and the list should appear), diagnose with
> `claude plugin list`:
>
> - After pulling a settings change into an already-scanned checkout: run `/reload-plugins` or relaunch.
> - If it reports the workspace "was not trusted when plugins were scanned": plugin loading is gated on
>   `hasTrustDialogAccepted` for the project in `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json` if you set that
>   variable). For **git worktrees** the flag is read from the **main checkout's** entry. Known bugs can leave it
>   `false` even though sessions start without a trust prompt (anthropics/claude-code#36403, #9113). Fix: set it to
>   `true` for the main checkout's path, then start a fresh session. Trust is only read at startup; `/reload-plugins`
>   won't pick it up.

## Skills

### Repo skill: `test-first`

`.claude/skills/test-first/SKILL.md` is the mandatory test-first loop for code under `platform-js/platform-js/src`:
design the test → write it → observe **red** for the right reason → **user gate** (you review the test before any
implementation) → implement → observe **green** → review → refactor. A test that fails for the right reason is never
weakened to fit the implementation.

Type `/test-first` to run it. The agent also invokes it by itself for feature and bug-fix work, based on the skill
description.

### Effect skills (`skills-lock.json`)

The official Effect skills (`effect-ts`, `effect-v3-to-v4` from `Effect-TS/skills`) are managed by the
[`skills`](https://www.npmjs.com/package/skills) CLI. It copies them into `.claude/skills/`, and both the copies and
`skills-lock.json` (source, commit and content hash of each skill) are committed, so a fresh clone has them with no
install step. Run these at the repo root; without `-g` the CLI only touches this repo:

```bash
# Add (writes .claude/skills/<name>/ and skills-lock.json)
npx skills add Effect-TS/skills --skill effect-ts --skill effect-v3-to-v4 -a claude-code

# See whether upstream has changed, then update (moves the commit in skills-lock.json forward)
npx skills check
npx skills update
```

Never hand-edit these skill folders: the next update overwrites them, and the content hash stops matching.

### Matt Pocock's skills

Enabled by the `mattpocock-skills@mattpocock` plugin above. This repo uses only some of them, in its own order (for
example, never `/to-spec` or `/implement-spec`). See [AgenticWorkflow.md](AgenticWorkflow.md) for which skills to use and
when.

## Name collisions

Two skill names mean something specific in this repo:

- **`tdd`** is Matt's skill (`/mattpocock-skills:tdd`), which `/implement` calls. Ours is named `test-first` so the two
  never clash. `test-first` is the hard rule; Matt's `tdd` runs inside it.
- **`code-review`**, when `/implement` calls it, means `/mattpocock-skills:code-review` (Standards and Spec review), not
  Claude Code's built-in `/code-review`.

## Hooks

None yet. Format-on-edit and verify-on-stop hooks are a follow-up once the toolchain settles: `platform-js/` has no
`format` or `typecheck` scripts today, it uses TypeScript 7, and the Effect language service is not set up.
