# Scope spec template

Copy the skeleton, keep the numbering (reviewers and later revisions refer to sections by
number), and delete guidance text. The header table is the thing a returning session reads
first, so keep it current at every revision. `example-spec.md` shows parts of it filled in.

```markdown
# <Feature name> — scope v1

| | |
|---|---|
| Slug / flag key | `<slug>` / flag or "reuses <existing gate>" |
| Track stage | **Scope v1 rev N, <date>.** Where the work stands: which steps are built, committed or not, what is next |
| Policy | Which repo policy applies (e.g. the repo's rules for new screens or flags; a logged exception) |
| Page / area | Route or screen, legacy and new file paths |
| Upstream contract | The API or service this consumes, with its code location |
| Background | The architecture notes or READMEs the design rests on |

Paths are `<repo>/<path>`; state any shorthand once.

## Contents
1. Problem and users · 2. Scope and non-goals · 3. What exists today · 4. Design ·
5. API contract · 6. Screen behaviour · 7. Acceptance criteria · 8. Decisions · 9. Implementation plan ·
10. Verification · 11. Later · 12. Change log

## 1. Problem and users
What is wrong or missing, who feels it, where. A table of user → does → where.

## 2. Scope and non-goals
S1..Sn in scope; N1..Nn out. Non-goals get numbers because review issues will flip some of them
(an N-item that becomes a step is struck through, not deleted).

## 3. What exists today — the facts the design rests on
Per area, bullets with `path:line` citations and "verified on <date>". Include the quirks
(a route with no leading slash, a sanitizer whitelist, a redirect inside a helper). This is the
section that prevents rework; spend the time here.

## 4. Design
A sequence diagram if more than two parties talk (validate Mermaid before delivery). Then a
table of design points D-A, D-B … each one a sentence of what and a sentence of why.

## 5. API contract
Per endpoint: route, caller, a status table (code · body · when), the body shape verbatim from
the wire. New endpoints marked NEW; reused ones "unchanged except …".

## 6. Screen behaviour
Per shell or page: markup sketch, handler, states (loading, empty, error) and the exact user-facing
strings. Files table: New / Changed per shell.

## 7. Acceptance criteria
AC-1..AC-n, each with what pins it (a test name, "manual on <env>"). Review issues append
AC-n+1 with the revision in brackets.

## 8. Decisions — recommendation first
| # | Decision | Recommendation (with the reason) | Alternative |
Then a status line once answered: "accepted provisionally, re-reviewed per step" or the choice.

## 9. Implementation plan
9.0 working agreement (file list before each step; stop for review; branches; no commits).
9.1..9.n one subsection per step with Added / Changed file tables (repo-relative, one line each).
Then the step table: step · repo · work · effort. Upstream first.

## 10. Verification
Local: the exact commands (rebuild images, curl with headers, e2e test hooks), the data needed,
and what the local seed cannot show and where to check that instead. Non-prod: deploy order,
config that must exist, nothing new to configure if that is true.

## 11. Later
L1..Ln. Struck through with "done in step N" when they land; measurements go here when a
performance lever is identified but not pulled.

## 12. Change log
| Rev | Date | Change | — one row per revision: what changed, why, which sections.
```

## Writing notes

- Recommendation first, reason second, alternative third. The user decides from the table.
- Record what was *not* chosen when the user picks from options; the next session will
  otherwise re-propose it.
- When a fact in §3 turns out wrong, correct it in place with the revision number rather than
  appending a contradiction.
- Numbers (bytes, milliseconds, counts) go in a table or on their own line, never buried in prose.
