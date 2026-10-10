# ngjs-vue-drift skills

Two Claude Code skills for an **AngularJS → Vue migration** where the Vue SPA is ported from an AngularJS
app that keeps changing in the same repository. They manage the *dual-maintenance* problem: the port is
anchored to a recorded legacy baseline commit, and every so often the legacy drift since that commit has
to be triaged and re-ported.

| Skill | Role | Writes? |
|---|---|---|
| `ngjs-vue-drift-check` | Triage: which merged legacy PRs since the baseline change behaviour the Vue port mirrors | No — report only |
| `ngjs-vue-drift-port` | Execute: re-port the behaviour with citations and tests, run the gates, bump the baseline, write the log entry, stop uncommitted | Yes — code and docs |

Both skills are project-agnostic. Every path, command and convention comes from a per-project config
file, `ngjs-vue-drift.config.md`.

## Install

1. Copy `ngjs-vue-drift-check/` and `ngjs-vue-drift-port/` into the target repo's `.claude/skills/`.
2. Copy `ngjs-vue-drift-check/templates/ngjs-vue-drift.config.template.md` to the repo root (or
   `.claude/`) as `ngjs-vue-drift.config.md` and fill in every value.
3. Make sure the migration tracker document has the three sections described in the template's
   "Tracker document contract": the baseline block, the newest-first progress log, and the Dead / Won't-port
   log.
4. Make sure ported Vue code cites its AngularJS source in the shapes listed under `citation_patterns`.
   The citation grep is the heart of the check; without citations it cannot find counterparts.

## Workflow

```
/ngjs-vue-drift-check                     # triage against the branch head
/ngjs-vue-drift-check up to <sha>         # pin the tip
/ngjs-vue-drift-port 1234 1240            # port the PRs the check flagged
/ngjs-vue-drift-port all                  # check, then port everything flagged Re-port needed
/ngjs-vue-drift-port none                 # nothing to port: bump the baseline and log only
```

The port skill always finishes with the working tree uncommitted; the developer reviews and commits.

## Assumptions baked into the skills

- Legacy routes are UI-Router `.state()` registrations; Vue route names equal legacy state names and URL
  paths equal legacy hash paths (route parity).
- Legacy `$uibModal` dialogs stay modals in Vue.
- The AngularJS tree and backend are read-only to the port; only files listed in `approved_legacy_edits`
  may be touched.
- Merged PRs are first-parent merge commits whose title matches `merge_commit_pattern`.
