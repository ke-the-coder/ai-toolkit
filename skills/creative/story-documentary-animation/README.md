# story-documentary-animation (portable skill)

A Claude Code skill that turns a short story into one self-contained HTML page: an animated story in classic nature-documentary style, made for a young child watching with a parent. Everything is generated in the browser:
- Canvas scenes;
- an orchestral score in Web Audio;
- word-by-word Chinese and English subtitles;
- a deep male Mandarin narrator, Edge's 云健, recorded once and embedded so Chrome sounds the same.

## Install

Copy this `story-documentary-animation` folder into one of these:
- `<your project>/.claude/skills/`, for one project;
- `~/.claude/skills/`, for all your projects.

Then give Claude a story and ask, for example, 「把这个故事做成动画」 or "animate this story as a documentary".

Claude posts a storyboard first and builds nothing until you approve it. A build then takes an hour or more.

## Needs

- Windows, with Google Chrome and Microsoft Edge. Edge supplies the 云健 voice.
  - If either browser isn't in its default place, set `CHROME` or `EDGE` to its full path.
- Node.js 22 or later (tested on 24).
- Python 3 with Pillow (tested on 3.13).

## Inside

| Folder | What it holds |
|---|---|
| `SKILL.md` | the workflow, rules and pitfalls Claude follows |
| `template/` | the engine, with a complete demo story (盘古开天辟地) and no recordings |
| `reference/` | the engine map, storyboard format, voice pipeline, and every test with what a pass looks like |
| `tools/` | the checks, screenshot, recording and sound-measurement scripts |
| `example/` | three built stories without their recordings, plus their approved storyboards, as a parts library |

The recordings are for private use; check Microsoft's terms before publishing pages that embed them.
