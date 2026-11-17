---
paths:
  - '.claude/**'
---

# Claude Code config — hard rules

- **`.claude/settings.json`** is tracked by git — shared team config. It holds plugins (`extraKnownMarketplaces`,
  `enabledPlugins`) and `attribution` only. **NEVER add `permissions` here**; personal settings go in the gitignored
  `.claude/settings.local.json`. **No `hooks` either**, until the follow-up issue that adds the shared hooks changes
  this rule.
- `.claude/skills/effect-ts` is vendored Effect 3 guidance (Claude-Matrix, MIT), not CLI-managed. Edit it by hand only
  with a note in its `ATTRIBUTION.md`.
- `.claude/skills/effect-v3-to-v4` is copied in by the `skills` CLI and pinned in `skills-lock.json` (copy install
  mode). Never hand-edit it; change it only with `npx skills update`.
- Repo-owned skills live in `.claude/skills/<name>/SKILL.md` (e.g. `test-first`) and are invoked by short name.
- Setup, plugins, skills and troubleshooting reference: `docs/ClaudeCode.md`. Keep it in step when this config changes.
