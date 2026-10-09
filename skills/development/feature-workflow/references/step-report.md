# Message shapes

Three messages recur. Keep them short; the user reads them between other work.

## 1. File list (before a step or a fix)

```
**Step N files, <repo> (`<root>/…`), for your go. Added:**

| File | Change |
|---|---|
| `path/NewThing.cs` | one line: what it is |

**Changed:**

| File | Change |
|---|---|
| `path/Existing.cs` | one line: the hunk |

Left alone on purpose: <files a reader might expect, and why not>.
Checks: <gates> ; <live check and what it needs>.
Say "go".
```

If the list differs from the spec's draft, say what moved and why before the tables.

## 2. Step report (after build + gates + live check)

```
Step N is built and verified. Nothing is committed.

**What it does.** Two or three sentences in product terms.

**Verified.** A short table or bullets: gate → result; live check → the numbers.
One sentence on anything that could not be verified and why (no login against that database).

**Files.** Added / Changed, as links.

<Only if something was caught and undone: what, how it was fixed, what proves it.>

**Still yours.** The checks only the user can do; decisions pending.

<Next step's file list, if the user has said the plan stands.>
```

## 3. Review-issue reply

```
<Issue restated in one line.> Cause: one sentence, with the evidence (console line, curl, measurement).

**Fix (recommended).** What and why. **Alternative.** What and the trade-off.
(Use the question tool when the choice is discrete — labels, global vs local.)

**Files.** Added / Changed tables.
Say "go".
```

After the fix: a step report in miniature, plus the spec revision number that records the cause.

## Hand-off (end of a session or a feature)

- One-line commit summary per repo, in the repo's style (read `git log`; for example
  `#1234 <area>: <what>`) — on request.
- Uncommitted change set per repo; files that must stay out.
- Memory updated; what remains the user's.
