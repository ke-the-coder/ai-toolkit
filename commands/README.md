# Batch-build command templates

Two slash-command templates for running a skill over a numbered list, one item at a time. They came from a project that builds one HTML page per story in a list of several dozen; nothing in them depends on that project or skill.

| Template | What it does |
|---|---|
| [batch-next.md](batch-next.md) | `/batch-next [count]`: find the next unbuilt item, build it, write the lessons back into the skill, repeat `count` times. |
| [batch-named.md](batch-named.md) | `/batch-named 35 36`: build the named items in the order given, skipping any that are unknown or already built. |

Both keep the same guard rails:
- one item at a time, each started fresh from the skill's template, never copied from the item just built;
- after each pass, the skill's own files get the lessons learned and the built list, so the next pass starts better;
- re-read the skill before the next item, since it just changed;
- never read a whole built output, only what the checks flag;
- stop on the first failure that can't be fixed, and never commit, only suggest one message per item.

## Use

1. Copy a template into `<your project>/.claude/commands/` and rename it, e.g. `story-next.md`.
2. Fill in the placeholders:

| Placeholder | Meaning | Example |
|---|---|---|
| `<skill>` | the skill that builds one item | `wen-html` |
| `<series>` | what the items are | `竹简上的故事 tales` |
| `<list source>` | where the numbered list lives | `history/wenyan.html` |
| `<build steps>` | the skill's steps for one item | `text, storyboard, page, hub entry, checks` |
| `<item id>` | the id form used in commit messages | `Z35` |

3. Keep `$ARGUMENTS`; Claude Code replaces it with what the user typed after the command.

The templates assume the skill keeps its own built list and a "next is" line in `SKILL.md`. If yours doesn't, change step 1 to work out the next item from the output folder instead, e.g. the lowest number with no page beside the list.
