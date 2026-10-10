---
name: ngjs-vue-drift-port
description: Port merged legacy AngularJS PRs into the Vue SPA of an AngularJS → Vue migration — behavioural rules with legacy citations, test specs, the quality gates, the legacy-baseline bump and the newest-first progress-log entry — then stop with the working tree uncommitted. Writes code and docs. Invoke as /ngjs-vue-drift-port <PR> [<PR> ...], /ngjs-vue-drift-port all, or /ngjs-vue-drift-port none.
argument-hint: <PR number> [<PR number> ...] | all | none
disable-model-invocation: true
---

# AngularJS → Vue drift port — execute the port of legacy changes into the Vue SPA

Executes the write half of the dual-maintenance **merge procedure**: re-port the drifted behaviour, run the
gates, move the baseline, log the merge. The project's **migration tracker** and its dual-maintenance
policy are the source of truth; if this checklist and they disagree, follow them and say so.
`/ngjs-vue-drift-check` is the read-only half — run it first when you do not already know which PRs need
porting.

A full run of this skill closes as **BASELINE MERGE #N**; the number and the previous baseline come from
the tracker, never from memory.

## Configuration

All project-specific values come from `ngjs-vue-drift.config.md` (repo root, then `.claude/`).
The template `ngjs-vue-drift-check/templates/ngjs-vue-drift.config.template.md` (in the check skill's
folder) documents every field. In addition to the keys the check skill uses, this skill needs:

| Key | Meaning |
|---|---|
| `gates` | Ordered list of commands that must all pass (typecheck, lint, test, build …) |
| `test_count_command` | Optional: how to read the running test count the log tracks as `<old> → <new>` |
| `template_gates` | Optional: extra commands to run only when a `.vue` template changed |
| `forbidden_commands` | Commands never to run (e.g. a repo-wide formatter on a tree that is not format-clean) |
| `layer_order` | Dependency-first order for adding Vue code, e.g. `api → utils (pure rules) → stores → views/components` |
| `test_pattern` | Where ported rules are pinned (pure functions tested without a DOM, component specs where the rule is in markup) |
| `progress_log_heading` | Heading of the newest-first progress log in the tracker |
| `log_entry_format` | The house format of a baseline-merge log entry |
| `verification_worklists` | Optional: path pattern of per-wave RE-VERIFY worklists |
| `legacy_url_prefix`, `vue_url_prefix` | How the same hash path is reached in each app, e.g. `/#` and `/spa/#` |
| `commit_title_convention` | Optional: the title format the owner uses when they commit the port |
| `approved_legacy_edits` | The only legacy files that may ever be touched, if any |

If the config file is missing, stop and ask. Never guess paths or commands.

## Inputs (`$ARGUMENTS`)

| Argument | Meaning |
|---|---|
| `<N> [<M> …]` | PR numbers to port (their merge commits on `main_branch`, matched by `merge_commit_pattern`) |
| `all` | Run the `/ngjs-vue-drift-check` procedure first, then port every PR it classifies **Re-port needed** |
| `none` | Nothing to port (a check found only no-ports): perform only the baseline bump + progress-log entry |
| *(empty)* | **Stop and ask** which PRs to port. Never guess |

## Preconditions

- Work on the **current branch**; do not create branches, switch branches, stash, reset or rebase.
- `git status --short` first. Existing uncommitted changes are reported, not touched, and never staged by
  this skill.
- Read the baseline from the tracker's baseline block (never from the prompt), `git fetch origin`, and
  confirm each requested PR is a first-parent merge commit on `main_branch` after the baseline:
  `git log --oneline --first-parent <baseline>..<main_branch> --grep "<merge_commit_pattern for N>"`.
  Unknown PR → stop and ask.

## Procedure — per PR

1. **Read the change.** `git show <sha> -- <legacy_paths...>`.
   Note every behavioural change: endpoint / verb / path / params, payload and response shape, validation
   rule and its verbatim user-facing message, permission-gating and visibility, `$state.go` navigation,
   user-visible ordering and filtering, `$uibModal` openers and their arguments.
2. **Find the Vue counterpart.** Use the Grep tool with `path: <vue_path>`, or
   `git grep -n "<stem>\.\(js\|html\)" -- <vue_src> <vue_tests>` and
   `git grep -n "ports app/<module>" -- <vue_src>` — the citation comments name the module.
   When adding code, follow `layer_order` (dependency-first).
3. **Port** each rule with a comment citing `app/<path>.js:<lines>` and the PR's merge short sha (the
   baseline hash will move, so cite the merge, not the baseline), keeping user-facing strings verbatim.
   Honour the standing rules:
   - **Route parity** — Vue route name = AngularJS state name, URL path = legacy hash path.
     Non-negotiable.
   - **Modals stay modals** — never downgrade a legacy `$uibModal` to a deep link, and carry every opener
     argument across.
   - **No `v-html`** for API or user content.
   - **No new dependencies** — use what the Vue project already has.
4. **Pin** every ported rule in `vue_tests` following `test_pattern`.
5. **New `.state()` registrations.** When `state_inventory` is configured: regenerate the inventory,
   bump the expected-count constant (this is the **only** place and the **only** occasion — a baseline
   merge — on which that constant moves), add the ledger rows to `status_ledger`, and put the
   port-now-vs-schedule call to the owner.
6. **`Not started` states.** Add a `changed-since-inventory` note to the row in `status_ledger` and write
   no code — the eventual porter diffs against current.
7. **Skip, and record why:** areas in the tracker's Dead / Won't-port log; result-set-only backend filters
   (no endpoint, verb, param or shape change); vendored dists; changes whose only consumer is not the Vue
   app. These become explicit no-port lines in the log entry, not code.

## Procedure — once, after all PRs

8. **Gates.** In `vue_path/`, run every command in `gates`, in order. All must pass. Record the test count
   via `test_count_command` when configured (the log carries it as `<old> → <new>`). A failure caused by
   the port is fixed; a pre-existing unrelated failure is reported verbatim, not worked around. When the
   port touched any `.vue` template, also run `template_gates`. Never run anything in
   `forbidden_commands`; format only the files you touched.
9. **Bump the baseline block** in `tracker_doc` → `baseline_heading`: a new
   `> **Baseline commit: <new short sha>**` line with the branch-head date, `BASELINE MERGE #N` and a
   one-line summary of what drifted and what was re-ported; demote the old line to
   `> Previous baseline: <old short sha>` and **keep the whole history below it**.
10. **Progress-log entry**, newest-first at the top of `progress_log_heading`, in `log_entry_format`.
    Default format:
    `- **<today> (BASELINE MERGE #N — merge procedure run against branch head \`<tip>\`; new baseline \`<new>\`, previous \`<old>\`)** — …`
    The narrative walks the four merge-procedure steps: (1) the diff scope and what changed, own commits
    excluded; (2) the citation grep and which ported states it hit; (3) what was re-ported, with legacy
    citations and Vue files, every no-port with its reason, and cancelled pairs; (4) hash bumped. Close
    with the gates result and the test count.
    The entry lists the affected pages with their hash URIs — `- **New ported pages & URIs**` for new
    pages, `- **Pages affected (no URI change)**` when only behaviour moved. Paths are identical in both
    apps (route parity): `<vue_url_prefix><path>` in Vue, `<legacy_url_prefix><path>` in legacy.
    Log gotchas, don't just fix them.
11. **Verification worklists.** When `verification_worklists` is configured and a `Ported`/`Verified`
    page's client behaviour changed, add a RE-VERIFY note to the affected wave's worklist, matching the
    existing row format there. Say in the log entry when no worklist note was needed and why.
12. **Stop.** Summarise what changed, print `git status --short`, and leave everything **uncommitted**.
    Do not run `git commit` or `git push` — the developer commits, not the assistant; approving the work is
    not approving the commit. `git add` only if the owner asks. When they do ask, use
    `commit_title_convention` if configured.

## Guardrails (standing rules)

- **The AngularJS app is read-only.** Never edit the legacy `app/**` tree (except files listed in
  `approved_legacy_edits`), and never touch backend or controller code. Match the legacy app's API usage
  exactly — read the AngularJS service and the backend controller rather than guess; when behaviour is
  ambiguous, **ask**.
- No repo-wide formatting; no new dependencies; no `v-html` for API/user content.
- One PR at a time in the log narrative; a re-port from a later merge says so in its citation.
- Bump the expected state count only here, on a baseline merge — never to silence a generator failure.
