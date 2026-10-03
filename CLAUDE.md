## Frontend structure

`src/` is split by responsibility: `components/`, `hooks/`, `utils/`, `styles/`, `stores/` (zustand), `pages/` (one folder per first URL segment), `types/`, `services/`. At most two levels of subfolders under each. Read `docs/frontend-structure.md` before adding or moving files, and update it (including its example tree) whenever the structure changes.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
