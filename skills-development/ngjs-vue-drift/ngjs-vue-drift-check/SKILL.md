---
name: ngjs-vue-drift-check
description: Read-only triage of legacy AngularJS changes merged since the legacy baseline commit recorded in the Vue migration tracker, for an AngularJS → Vue migration where the Vue SPA is ported from a still-changing AngularJS app. Use when asked to "drift check", "baseline check", "what changed in legacy since the baseline", "drift check before the merge", or "drift check up to <sha>". Reports which merged PRs need re-porting into the Vue SPA and why the others do not. Makes no code changes, never bumps the baseline, never runs the gates, never commits.
argument-hint: [up to <sha>]
disallowed-tools: Edit Write NotebookEdit
---

# AngularJS → Vue drift check — legacy drift triage (read-only)

The Vue SPA is ported from the AngularJS app as of a recorded **legacy baseline commit**. Both live on the
same branch, and the AngularJS app keeps changing for the whole programme (the central risk of a parallel
build). This skill answers one question: *which legacy changes merged since that commit change behaviour
the Vue port mirrors?* It is an assessment only.

The project's **migration tracker** and its dual-maintenance policy are the source of truth; if this
checklist and they disagree, follow them and say so. `/ngjs-vue-drift-port` is the write half.

## Configuration

All project-specific values come from `ngjs-vue-drift.config.md` (look in the repo root, then `.claude/`).
`templates/ngjs-vue-drift.config.template.md` in this skill's folder documents every field. The ones
this skill needs:

| Key | Meaning |
|---|---|
| `tracker_doc` | Markdown tracker holding the baseline block and the progress log |
| `baseline_heading` | Exact heading of the baseline block (default `## Legacy baseline`) |
| `main_branch` | Remote branch both apps live on, e.g. `origin/main` |
| `merge_commit_pattern` | How merged PRs appear in first-parent history, e.g. `Merged PR <N>:` or `Merge pull request #<N>` |
| `legacy_paths` | AngularJS app paths in drift scope (the `app/` tree plus the backend controllers ported pages consume) |
| `vue_path`, `vue_src`, `vue_tests` | Vue SPA root and its source / test folders |
| `exclude_paths` | Paths named in the report but never analysed (vendored dists, retired projects, test projects, approved legacy edits) |
| `citation_patterns` | How ported Vue code cites its AngularJS source (header lines, inline `file:lines` refs) |
| `state_inventory` | Optional: inventory generator script, expected-count constant, raw / live / abstract counts |
| `status_ledger` | Where each AngularJS state's migration status lives (`Not started` / `Ported` / `Verified` …) |
| `wont_port_heading` | Heading of the tracker's Dead / Won't-port log |

If the config file is missing, stop and ask for these values. Never guess paths.

## Inputs

- `$ARGUMENTS` — optional. `up to <sha>` pins the tip to a commit instead of `main_branch`. Anything else:
  ignore and use `main_branch`.
- **The baseline commit is read from the tracker's baseline block, never from the prompt or from
  memory.** Every previous baseline is kept in that block; only the first `> **Baseline commit:**` line is
  current.

## Procedure

1. **Baseline.** Open `tracker_doc`, find `baseline_heading`, take the first
   `> **Baseline commit: <sha>**` and the branch-head date beside it. Note the BASELINE MERGE number — the
   next one is `#N+1`.
2. **Tip.** `git fetch origin`. Tip = `main_branch`, or the pinned `<sha>`. Record
   `git rev-parse --short <tip>`. Work happens *on* the main branch, so the baseline is normally already an
   ancestor of `HEAD` — confirm with `git merge-base --is-ancestor <baseline> <tip>`; if it is not, stop
   and say so.
3. **Drift scope.** The AngularJS app plus the backend controllers that ported pages consume:
   ```
   git diff <baseline>..<tip> --stat -- <legacy_paths...>
   git log --oneline --first-parent <baseline>..<tip> -- <legacy_paths...>
   ```
   Merged PRs are first-parent merge commits matching `merge_commit_pattern`.

   **Exclude from triage** (name them in the report, do not analyse): everything in `exclude_paths`,
   plus the project's own commits — anything touching only `vue_path/**` or the migration docs.
4. **Per PR**, `git show --stat --format='%h %ad %s' --date=short <sha> -- <legacy_paths...>`, then read
   the diff of the non-excluded files.
5. **Cancelled pairs.** A PR followed by a `Revert '…'` of it: verify the net diff is empty
   (`git diff <before-pr>..<after-revert> --stat -- <legacy_paths...>`) and classify both **Cancelled**.
6. **Citation grep — the core step.** Every ported rule in the Vue tree cites its AngularJS source. For
   each changed legacy file take the path and the file stem and search the Vue tree, using the Grep tool
   with `path: <vue_path>` or `git grep` in a shell:
   ```
   git grep -n "<stem>\.\(js\|html\)" -- <vue_src> <vue_tests>
   git grep -n "ports app/<module>" -- <vue_src>
   ```
   Match the shapes listed in `citation_patterns` — typically a header line
   `* … ports app/<module>/<file>.js` and inline `(<file>.controller.js:67-70)` / `app/<path>.js:2` refs.
   Hits name the Vue modules that mirror the file. **No hits plus a behavioural change is not "nothing to
   do"** — check the state's status before concluding (step 8).
7. **New or removed states.** If any `*.routes.js`, module file or other registration file gained or lost
   a `.state(` registration, the inventory count moves. When `state_inventory` is configured, report the
   delta against its expected count and list the new state names. That constant is bumped **only** on a
   baseline merge, by `/ngjs-vue-drift-port`, never by a check.
8. **Status lookup.** For every Vue module the citations hit, read the state's migration status from
   `status_ledger`, and check the tracker's `wont_port_heading` log before calling anything a gap.
9. **Classify** each PR:

   | Verdict | When |
   |---|---|
   | **Re-port needed** | A changed legacy file is cited by a `Ported`/`Verified` Vue module *and* the change is behavioural: endpoint / verb / path / params, payload or DTO shape, validation rule and its verbatim message, permission-gating or visibility, navigation or `$state.go`, user-visible ordering or filtering, a new modal or a new modal opener argument |
   | **New state** | A new `.state()` registration — needs an inventory regen plus a ledger row; name it and flag the owner call on port-now vs schedule |
   | **Note only** | The affected states are `Not started` — the ledger row gets a `changed-since-inventory` note and nothing else (the eventual porter diffs against current) |
   | **No-port** | A backend change that alters result **sets** only — no endpoint, verb, param or response shape, so both apps simply return different rows, by design; legacy CSS / layout with no Vue counterpart; areas in the Won't-port log; vendored dists; changes whose only consumer is not the Vue app. Cite the decision |
   | **Cancelled** | PR + its revert, empty net diff |
   | **Check with owner** | Behavioural but scope is ambiguous — say exactly what is ambiguous |

10. **Report** (markdown, nothing written anywhere):
    - Header: baseline `<short>` (branch head `<date>`, BASELINE MERGE #N) → tip `<short>` (`<date>`),
      M merged PRs in scope, K changed legacy files, state-count delta.
    - Table: `| PR | Title | Legacy files (in scope) | Vue citations hit | State status | Verdict | Reason |`,
      one row per PR.
    - Footer: `Pin: "drift check up to <tip short sha>"`, and either
      `Suggested next: /ngjs-vue-drift-port <N> [<M> …]` or `Suggested next: /ngjs-vue-drift-port none`
      (bump only).

## Guardrails

- **No edits, no baseline bump, no progress-log entry, no gates, no commits.** `/ngjs-vue-drift-port` does
  all of that. A drift check means the triage report and nothing else — it is *not* the gates.
- Do not skip a PR because its title sounds cosmetic — open the diff. A backend controller change is in
  scope whenever a ported page consumes that endpoint.
- Do not mark "Re-port needed" without naming the Vue file(s) that cite the changed legacy file, or
  stating plainly that it is new behaviour with no counterpart yet.
- A legacy `$uibModal` stays a modal in Vue — a change that adds an opener argument or a new modal is
  behavioural, never "a deep link will do".
- When an endpoint's behaviour is ambiguous from the backend or the AngularJS service, say so under
  "Check with owner" rather than assume.
