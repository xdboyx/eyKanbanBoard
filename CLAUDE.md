## Frontend structure

When writing or changing code under `src/`, follow `.claude/rules/frontend-structure.md`: it decides which folder every file goes in, the folder depth limit, the dependency direction and naming. If a file doesn't fit any folder there, ask instead of inventing a new one. Whenever the structure changes, update that file (including its example tree) in the same change.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
