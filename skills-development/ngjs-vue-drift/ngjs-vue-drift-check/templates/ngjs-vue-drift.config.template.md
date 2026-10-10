# ngjs-vue-drift configuration

Copy this file to your repo root (or `.claude/`) as `ngjs-vue-drift.config.md` and fill in every value.
Both `/ngjs-vue-drift-check` and `/ngjs-vue-drift-port` read it; neither skill contains project paths.
Values are illustrative — replace them with yours.

```yaml
# --- Repository layout -------------------------------------------------------
main_branch: origin/main                     # branch both apps live on
merge_commit_pattern: "Merged PR <N>:"       # first-parent merge title; or "Merge pull request #<N>"

legacy_paths:                                # AngularJS app + backend code ported pages consume
  - Legacy.Web/app/
  - Legacy.Web/Controllers/
  - Legacy.Web/Web.config

vue_path: Legacy.Web.Spa/
vue_src: Legacy.Web.Spa/src
vue_tests: Legacy.Web.Spa/tests

exclude_paths:                               # named in the report, never analysed
  - Legacy.Web/vendor-dist/**                # prebuilt dist committed to the tree
  - Legacy.Web.Tests/**
  - Legacy.Web/app/layout/base.html          # the one approved legacy edit (portal link to the SPA)

approved_legacy_edits:                       # the ONLY legacy files the port skill may ever touch
  - Legacy.Web/app/layout/base.html

# --- Migration tracker -------------------------------------------------------
tracker_doc: Legacy.Web.Spa/migration-docs/Vue_Migration_Progress.md
baseline_heading: "## Legacy baseline"
progress_log_heading: "## Progress log (newest first)"
wont_port_heading: "## Dead / Won't-port log"

# --- Citations: how ported Vue code points back at AngularJS -----------------
citation_patterns:
  - "* ... ports app/<module>/<file>.js"     # file-header line
  - "(<file>.controller.js:<from>-<to>)"      # inline line-range ref
  - "app/<path>.js:<line>"                    # inline single-line ref

# --- State inventory (optional; delete the block if you do not track it) -----
state_inventory:
  generate_command: npm run generate:inventory
  constant_file: tools/migration/generate-state-inventory.mjs
  constant_name: EXPECTED_STATE_COUNT
  inventory_doc: migration-docs/state-inventory.md
status_ledger: Legacy.Web.Spa/tools/migration/state-status.csv

# --- Gates (run from vue_path, in order; all must pass) ----------------------
gates:
  - npm run typecheck
  - npm run lint
  - npm test
  - npm run build
test_count_command: "npm test -- --reporter=dot | tail -n 5"   # how to read the running test count
template_gates:                              # only when a .vue template changed
  - npm run lint:testids
forbidden_commands:
  - npm run format                           # tree is not format-clean; a repo-wide run breaks lint

# --- Vue conventions ---------------------------------------------------------
layer_order: "src/api/<module>.api.ts -> src/features/<module>/utils/*.ts (pure rules) -> stores -> views/components"
test_pattern: "pure rules under features/<module>/utils tested without a DOM; component specs where the rule lives in markup"
legacy_url_prefix: "/#"
vue_url_prefix: "/spa/#"

# --- Logging & commits -------------------------------------------------------
log_entry_format: "- **<date> (BASELINE MERGE #N — merge procedure run against branch head `<tip>`; new baseline `<new>`, previous `<old>`)** — ..."
verification_worklists: Legacy.Web.Spa/migration-docs/verification/W<n>-worklist.md   # optional
commit_title_convention: "vue: <module> — <states> (#<PR>)"                           # optional
```

## Tracker document contract

The skills expect `tracker_doc` to contain three sections, by the headings configured above:

1. **Baseline block** — the first `> **Baseline commit: <sha>**` line is current and carries the branch-head
   date, `BASELINE MERGE #N` and a one-line summary. Older entries are kept beneath it as
   `> Previous baseline: <sha>` lines. Example:

   ```markdown
   ## Legacy baseline

   > **Baseline commit: a1b2c3d** (branch head 2026-01-15, BASELINE MERGE #3) — re-ported invoice
   > validation (PR 1234); PR 1240 no-port (result-set filter only).
   > Previous baseline: 9f8e7d6 (branch head 2025-12-01, BASELINE MERGE #2) — ...
   > Previous baseline: 5c4b3a2 (branch head 2025-10-20, BASELINE MERGE #1) — initial anchor.
   ```

2. **Progress log (newest first)** — one bullet per baseline merge in `log_entry_format`.

3. **Dead / Won't-port log** — areas deliberately not ported, each with the decision and its reason. The
   check skill consults it before calling anything a gap.
