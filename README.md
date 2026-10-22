# ai-toolkit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Skills, prompts and project instructions for working with AI coding agents, mainly Claude Code.

## Layout

```
ai-toolkit/
├── skills-development/   # skills for building software
├── skills-creative/      # skills for making creative work
├── commands/             # slash-command templates, e.g. batch-build a skill over a list
├── prompts/              # reusable prompts, e.g. the "create a skill" prompt   (planned)
├── instructions/         # CLAUDE.md / AGENTS.md templates for projects         (planned)
└── references/           # notes, guides, lessons learned                       (planned)
```

Each skill is a folder with a `SKILL.md` at its top. A folder may also group several related skills, as `ngjs-vue-drift/` does.

## Skills

### Development

| Skill | What it does |
|---|---|
| [feature-workflow](skills-development/feature-workflow/) | Spec-first feature building with approval at each step, in one repo or across several: scope spec, per-step file list and "go" gate, checks, review-issue loop and hand-off. |
| [ngjs-vue-drift](skills-development/ngjs-vue-drift/) | Two skills for an AngularJS → Vue migration: `ngjs-vue-drift-check` triages legacy PRs merged since the baseline (read-only), and `ngjs-vue-drift-port` re-ports them into the Vue SPA. |

### Creative

| Skill | What it does |
|---|---|
| [story-documentary-animation](skills-creative/story-documentary-animation/) | Turns a short story into one self-contained HTML animation in nature-documentary style, with Canvas scenes, a Web Audio score, Mandarin narration and Chinese + English subtitles. |

## Commands

| Template | What it does |
|---|---|
| [batch-next](commands/batch-next.md), [batch-named](commands/batch-named.md) | Run a skill over a numbered list one item at a time: find the next (or the named) unbuilt items, build each, write the lessons back into the skill, stop on the first failure. Fill in the placeholders, then copy into `<your project>/.claude/commands/`. See [commands/README.md](commands/README.md). |

## Install a skill

Copy the skill's folder (the one holding `SKILL.md`) into one of these:

- `<your project>/.claude/skills/`, for one project;
- `~/.claude/skills/`, for all your projects.

For a group such as `ngjs-vue-drift/`, copy each skill folder inside it. Some skills have their own README with extra setup steps or requirements; read it before installing.

## License

[MIT](LICENSE). The license covers this repo's code and docs only. Narration recorded with Microsoft Edge's voices (for example by `story-documentary-animation`) is governed by Microsoft's terms, not by this license.
