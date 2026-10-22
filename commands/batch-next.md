---
description: Build the next N items of <series> with <skill>, one after the other
argument-hint: "[count, default 1]"
---

<skill>: build the next $ARGUMENTS items of <series> in this session, one after the other (auto mode). If no count was given, build 1.

For each item:
1. Work out the next unbuilt item from <list source> and tell me which one it is (number and title).
2. Build it fully: <build steps, e.g. text, storyboard, page, checks>.
3. When it passes, write its lessons into the <skill> skill files, update the built list / "next is" line, and tell me what you added.
4. Before the next item, re-read SKILL.md and any reference files you changed. Start each item from the template and its own plan; don't copy from the item just built.

Throughout:
- Don't read whole built outputs; use the test tools and look at only what they flag.
- If an item fails a check you can't fix, stop and report. Don't start the next one.
- If there are no unbuilt items left, stop and say so.
- At the end, report on each item and suggest one commit message per item (e.g. "<item id>"). Don't commit.
