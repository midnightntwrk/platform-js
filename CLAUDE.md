# CLAUDE.md

Guidance for Claude Code in platform-js. The rest of this file (overview, documentation map, conventions, build commands,
architecture, testing, coding standards) is still to be written under #19.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `midnightntwrk/platform-js`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The skills' five triage roles map onto existing org labels (`status:untriaged`, `question`, `wontfix`); never create
the skills' bare default labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, and ADRs in `docs/decisions/` in MADR format. This overrides the
skills' `docs/adr/` path and minimal ADR format. See `docs/agents/domain.md`.
