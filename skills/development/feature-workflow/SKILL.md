---
name: feature-workflow
description: A spec-first, per-step-approval way to build features, in one repo or across several. Use it whenever the user briefs a new feature, change request, ticket or cross-repo change, asks to "scope", "spec", "design" or "plan" something, or hands over a list of review issues on a feature built this way — even when the brief looks small enough to code directly. It covers the scope spec (requirements, verified facts, design, contract, decisions with a recommendation first), the per-step file list + "go" gate, gates and live checks, the review-issue loop, and the hand-off (commit messages, memory, tracker). Not for one-off bug fixes with no design choice, or for pure questions.
metadata:
  author: Ke Yang
---

# Feature workflow

How a feature goes from a brief to a reviewable branch. The point of the ceremony: the user
makes the structural calls (where a controller lives, which route, which label) while they
are still cheap, and reviews each step while it is still small. Every step ends with the work
verified and the documents true, so a fresh session can continue from the files alone.

`references/example-spec.md` is a filled-in spec for a fictional feature, trimmed to its
header, a few facts, the decisions, the plan and the change log — read it once to see the
shape in practice.

## Standing rules (apply at every phase)

- **No commits, no branches, no pushes.** The user commits. Branches are named in the brief;
  if one is missing, ask. Local-only files (a config pointed at another database, a `.env`
  with a private endpoint) never go into a change set — say so in the hand-off.
- **File list before code, then wait for "go".** Every step and every review fix starts with a
  table of files to add and files to change, one line each on what changes. This is where
  structural choices surface; make them here, not after code exists.
- **Stop after each step for review.** A "go" covers one step. Accepted recommendations are
  provisional per step, not for the whole plan.
- **Edit shared files by exact hunks.** Never run a repo-wide formatter. Even a single-file
  `prettier --write` can reformat hunks that were never clean at HEAD — check first (bash):
  `diff <(git show HEAD:./<file>) <(git show HEAD:./<file> | npx prettier --stdin-filepath <file>)`.
  Any output means HEAD is not clean, so format only your own hunk; the same holds for any
  other formatter. Keep the `./`: without it git reads the path from the repo root, fails in a
  subfolder, and the empty diff looks clean.
- **Verify against the real thing.** Gates (typecheck, lint, tests, build) plus a live check
  on the running stack. When the local seed cannot show the behaviour (no stored files, no
  third-party data), say so and use the environment that can (a CI or staging stack,
  non-production data) or hand the check to the user explicitly. Never report a step done on
  gates alone when a live check was possible.
- **Keep the documents true.** Each change to the design is a numbered revision in the spec's
  change log, with the date and what moved. The tracker (issue, board or feature register),
  READMEs and memory say the same thing as the code at the end of every step.
- **Facts carry citations.** `path:line` for anything claimed about existing code; `verified
  on <date>` for anything checked live. A wrong fact in a spec costs a step later (the file
  URL that turned out to point at a thumbnail).

## Phase 0 — Brief

The user gives the goal, constraints and often the branches. Read first:

1. The repos' `CLAUDE.md` files, and the shared architecture or knowledge docs for anything
   cross-repo.
2. Memory entries for the feature and for the repos' local check recipes.
3. The code the feature touches, before writing a single design line.

Confirm the audience of every document you will write: specs are for the user and a future
session; READMEs are for the next engineer in that repo; commit messages are for the git log.

## Phase 1 — Scope spec

One document per feature, in the repo that owns it (usually the one whose screen or behaviour
changes). Use the repo's existing design-docs folder; if it has none, propose
`docs/features/<slug>/spec_<slug>_v1.md` and confirm it with the user. When an upstream repo
owns a contract the feature consumes, document the contract there (its README or docs
folder); the consumer's spec cites it and stays the design home. Cross-repo contracts and ops
material go in the shared docs repo, if there is one.

Write it with `references/spec-template.md`. The sections that earn their keep:

- **What exists today** — verified facts with citations. This is the slowest section to
  write and the one that prevents the most rework.
- **Decisions, recommendation first** — one table: the decision, your recommendation with the
  reason, the alternative. The user answers the table, not an essay.
- **Implementation plan** — ordered steps, upstream first (the endpoint before the UI that
  needs it), each with its file list. Steps live in one repo each where possible.
- **Verification** — the exact commands and the data needed, including what the local seed
  cannot show.

Assume specs are read with Mermaid rendering on (GitHub renders it natively), so a diagram
that does not parse is a defect. Before handing a spec over, run
`scripts/check-mermaid.mjs` on it (setup and usage in the script's header; the syntax traps
are: quote flowchart labels, `<br/>` not `\n`, no `;` in sequence messages).

Then stop. The spec is reviewed before any code.

## Phase 2 — Decisions

The user accepts, changes or defers each recommendation. Record the outcome in the spec
header ("accepted provisionally", "<name>: option B") and log it as a revision. Deferred
items go to the Later table with a number so they can be referenced.

## Phase 3 — Per-step loop

For each step in the plan:

1. **File list.** Added / Changed tables, repo-relative paths, one line each. If the list
   differs from the spec's draft, say what moved. Wait for "go".
2. **Build.** Exact hunks. Cite the legacy or upstream source you port from
   (`// ports <path>:<line>`) so the next reader can diff.
3. **Gates.** The repo's own, as its CI runs them — typecheck, lint, tests, build and any
   custom checks; some repos run a lighter set, and a large test suite can be narrowed to the
   affected classes. Take the list from `CLAUDE.md`, the package scripts, the CI config or
   memory, not from habit. Run the long ones in the background and in parallel, but re-run a
   timed-out test alone before calling it a failure.
4. **Live check.** Against the running stack with real data where the behaviour needs it.
   Rebuild container images that bake the code in rather than mounting it, or the check runs
   the old code. Record the numbers.
5. **Documents.** Spec revision, tracker entry or sub-bullet, README, any generated index or
   registry the repo keeps, memory.
6. **Report and stop.** Use `references/step-report.md`. Say what remains the user's to check
   and why (for example, no login works against that database). Present the next step's file
   list only when asked, or in the same message if the user has already said the plan stands.

## Phase 4 — Review issues

The user sends issues one at a time, often with a screenshot. For each:

1. **Diagnose with evidence** before proposing anything: reproduce from the browser console, a
   curl, a measurement. Name the cause in one sentence.
2. **Recommend, and give options where the choice is the user's** (a label, a global vs local
   fix). Use the question tool when the options are discrete.
3. **File list, go, build, verify, document** — the Phase 3 loop in miniature. Each fix is a
   spec revision with the cause recorded, so the "why" survives the session.
4. Fold what you learned back into the spec's verification section (for example, "file
   previews need the staging stack").

## Phase 5 — Hand-off

- One-line commit summaries per repo, in the repo's existing style (read `git log`; for
  example `#1234 <area>: <what>`), on request.
- The uncommitted change set per repo, with the files that must stay out.
- Memory updated: state, decisions, gotchas that cost time, what is still the user's to check.
- Anything that needs a decision from the user, listed as such.

## Where this skill does not apply

A one-line defect fix with no design choice, a question, or work already governed by its own
batch procedure (a migration done in batches under a plan with its own rules). Those still
inherit the standing rules above.
