# Claude Code Setup

Recommended Claude Code configuration for developers working on this repository.

## Settings file scopes

Claude Code merges settings from several files. Know which one you're editing:

| File                          | Scope               | Tracked by git  | What goes here                                                                |
| ----------------------------- | ------------------- | --------------- | ----------------------------------------------------------------------------- |
| `.claude/settings.json`       | This repo, everyone | **Yes**         | Shared team config (plugins, attribution). **No `permissions` or `hooks`.** |
| `.claude/settings.local.json` | This repo, just you | No (ignored)    | Your personal repo-scoped permissions                                         |
| `~/.claude/settings.json`     | All repos, just you | No              | Your personal global permissions (see below)                                  |

The tracked `.claude/settings.json` must never contain a `permissions` or `hooks` block. Permissions are personal and
belong in one of the other two files. Hooks wait for their follow-up issue (see [Hooks](#hooks)). The repo's own
`.gitignore` ignores `.claude/settings.local.json`, so `git add .` won't commit it by accident.

## Recommended personal permissions

These are recommendations, not enforced by the repo. Put them in `~/.claude/settings.json` so they apply everywhere, or
in `.claude/settings.local.json` for this repo only.

- **Deny** stops Claude from reading secrets, through the Read tool and through common shell commands.
- **Ask** gates outward-facing git and GitHub actions. Prompt-based rules ("always ask before committing" in a
  CLAUDE.md) are advisory, and the agent can drift. Permission rules are mechanical: a matching tool call is intercepted
  and you approve or reject it.

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
      "Read(~/.gnupg/**)",
      "Bash(cat .env*)",
      "Bash(cat */.env*)",
      "Bash(less .env*)",
      "Bash(head .env*)",
      "Bash(tail .env*)",
      "Bash(printenv:*)",
      "Bash(op read:*)",
      "Bash(gh auth token:*)"
    ],
    "ask": [
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git -C:*)",
      "Bash(gh pr create:*)",
      "Bash(gh pr edit:*)",
      "Bash(gh pr comment:*)",
      "Bash(gh pr review:*)",
      "Bash(gh pr merge:*)",
      "Bash(gh issue create:*)",
      "Bash(gh issue edit:*)",
      "Bash(gh issue comment:*)",
      "Bash(gh issue close:*)",
      "Bash(gh label create:*)",
      "Bash(gh api:*)"
    ]
  }
}
```

With these in place, the common ways to commit, push, merge, review, or create, edit, comment on or close PRs and
issues stop for your approval, whatever any CLAUDE.md says. They are a safety net, not a guarantee. A rule matches the
start of a command, so a command written another way can slip past it. The Bash denies cover only the common ways to
print a secret. `git -C` and `gh api` also catch read-only calls, so expect some extra prompts.

## Plugins (tracked, apply to everyone)

The tracked [`.claude/settings.json`](../.claude/settings.json) gives everyone the same plugins: Matt Pocock's
engineering skills (`mattpocock-skills`) and the mandatory Shielded engineering rules (`shielded-core-rules`). It also
blanks `attribution`, per the org rule on AI-assistance disclosure. Read the file for the details.

Pinning: a marketplace's `ref` in the settings takes only a branch or a tag, not a commit.

- The `mattpocock` marketplace (GitHub `mattpocock/skills`) is pinned to the tag `v1.3.2`. To bump it, change `ref`
  to a newer tag of `mattpocock/skills`, then update the plugin.
- The `shieldedtech` marketplace is not pinned. `shieldedtech/agent-rules` has no tags yet, so it follows `main`. Pin
  it once it publishes tags.

To update a plugin, use `/plugin` inside Claude Code, or `claude plugin update <plugin>` from a shell.

When you first trust the folder, Claude Code offers to install the marketplaces and plugins. Accept, and they load in
every later session.

`shieldedtech/agent-rules` is a private repo: you need access to the `shieldedtech` GitHub org to install
`shielded-core-rules`. Without it, the install fails and the plugin's checks don't run. Follow the commit sign-off and
`Assisted-by` trailer rules in `CLAUDE.md` by hand instead.

> **If the plugins' skills don't show up** (type `/mattpocock-skills` and the list should appear), diagnose with
> `claude plugin list`:
>
> - After pulling a settings change into an already-scanned checkout: run `/reload-plugins` or relaunch.
> - If it reports the workspace "was not trusted when plugins were scanned": plugin loading is gated on
>   `hasTrustDialogAccepted` for the project in `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json` if you set that
>   variable). For **git worktrees** the flag is read from the **main checkout's** entry. Known bugs can leave it
>   `false` even though sessions start without a trust prompt (anthropics/claude-code#36403,
>   anthropics/claude-code#9113). Fix: set it to `true` for the main checkout's path, then start a fresh session. Trust is only read at startup; `/reload-plugins`
>   won't pick it up.

## Skills

### Repo skill: `test-first`

`.claude/skills/test-first/SKILL.md` is the mandatory test-first loop for code under `platform-js/platform-js/src`:
design the test → write it → observe **red** for the right reason → **user gate** (you review the test before any
implementation) → implement → observe **green** → review → refactor. A test that fails for the right reason is never
weakened to fit the implementation.

Type `/test-first` to run it. The agent also invokes it by itself for feature and bug-fix work, based on the skill
description.

### Effect skills

Two Effect skills live in `.claude/skills/`, and both are committed, so a fresh clone has them with no install step.

**`effect-ts`** is vendored: a copy of the `effect-ts` skill from the
[Claude-Matrix](https://github.com/ojowwalker77/Claude-Matrix) project (MIT). It covers Effect 3, which this repo uses.
`.claude/skills/effect-ts/ATTRIBUTION.md` records the source commit, the local changes and the license. The `skills`
CLI does not manage it, and it is not in `skills-lock.json`. Edit it by hand, and note any change in `ATTRIBUTION.md`.

We don't use the `effect-ts` skill from `Effect-TS/skills`. It targets Effect 4: it is a setup recipe that runs
`pnpm add effect@latest` and points to `node_modules/effect/AGENTS.md`, a file Effect 3 doesn't have. It would install
the wrong major version with the wrong package manager.

**`effect-v3-to-v4`** comes from `Effect-TS/skills` and is managed by the
[`skills`](https://www.npmjs.com/package/skills) CLI. `skills-lock.json` records its source, commit and content hash,
with `"installMode": "copy"`. Always add it with `--copy`: that writes real files into `.claude/skills/`. Without it the
CLI may write symlinks into the gitignored `.agents/` folder, and a fresh clone would get broken links. `update` has no
`--copy` flag; it relies on the install mode in `skills-lock.json`, so after an update check with `git status` that
`.claude/skills/effect-v3-to-v4/` still holds real files, not a symlink. Run these at the repo root; without `-g` the
CLI only touches this repo:

```bash
# Add (writes .claude/skills/effect-v3-to-v4/ and skills-lock.json)
npx skills add Effect-TS/skills --skill effect-v3-to-v4 -a claude-code --copy

# Update this repo's skills to upstream (moves the commit in skills-lock.json forward)
npx skills update -p -y
```

Never hand-edit `effect-v3-to-v4`: the next update overwrites it, and the content hash stops matching.

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

The repo has no hooks of its own yet. Format-on-edit and verify-on-stop hooks are a follow-up once the toolchain
settles: `platform-js/` has no `format` or `typecheck` scripts today, it uses TypeScript 7, and the Effect language
service is not set up.

The `shielded-core-rules` plugin does add hooks. At session start, one tells Claude to load the Shielded rules. Before
each Bash call, two others block `gh pr create` or `gh issue create` without the `bot:ai-assisted` label, and block
commits, PR or issue text, or `gh api` payloads that carry an AI `Co-Authored-By` trailer or a "Generated with" line.
