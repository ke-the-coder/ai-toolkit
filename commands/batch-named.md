---
description: Build the named <series> items (e.g. 35 36) with <skill>, one after the other
argument-hint: "<item numbers, e.g. 35 36>"
---

<skill>: build these items of <series> in this session, one after the other, in the order given (auto mode): $ARGUMENTS

Read each number case-insensitively. If no numbers were given, stop and ask for them.

Before starting, check every number against <list source> and the skill's built list:
- If a number isn't in the list, tell me and skip it.
- If an item is already built, tell me and skip it. Don't rebuild it.

For each item:
1. Tell me which item it is (number and title).
2. Build it fully: <build steps, e.g. text, storyboard, page, checks>.
3. When it passes, write its lessons into the <skill> skill files, update the built list / "next is" line (the next is still the lowest unbuilt item, so building 35 before 33 leaves it at 33), and tell me what you added.
4. Before the next item, re-read SKILL.md and any reference files you changed. Start each item from the template and its own plan; don't copy from the item just built.

Throughout:
- Don't read whole built outputs; use the test tools and look at only what they flag.
- If an item fails a check you can't fix, stop and report. Don't start the next one.
- At the end, report on each item (built or skipped) and suggest one commit message per built item (e.g. "<item id>"). Don't commit.
