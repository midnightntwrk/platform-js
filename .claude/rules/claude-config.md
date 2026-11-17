---
paths:
  - '.claude/**'
---

# Claude Code config — hard rules

- **`.claude/settings.json`** is tracked by git — shared team config. It holds plugins (`extraKnownMarketplaces`,
  `enabledPlugins`) and `attribution` only. **NEVER add `permissions` or `hooks` here**; personal settings go in the
  gitignored `.claude/settings.local.json`.
- Effect skills (`.claude/skills/effect-ts`, `.claude/skills/effect-v3-to-v4`) are copied in by the `skills` CLI and
  pinned in `skills-lock.json`; both are committed. Never hand-edit them; change them only with `npx skills update`.
- Repo-owned skills live in `.claude/skills/<name>/SKILL.md` (e.g. `test-first`) and are invoked by short name.
- Setup, plugins, skills and troubleshooting reference: `docs/ClaudeCode.md`. Keep it in step when this config changes.
