# The storyboard (the checkpoint before building)

Post the storyboard in the chat, then **stop**. Don't copy the template, write drawing code or record anything until the user approves it.

The approved Chinese lines are what gets recorded. If a line changes after approval, that line has to be recorded again.

The finished example is [../example/storyboard.md](../example/storyboard.md). Copy its layout. A second one,
[../example/storyboard-02.md](../example/storyboard-02.md), shows how questions about the character's look and a violent
source detail were asked and answered. A third, [../example/storyboard-03.md](../example/storyboard-03.md), does the same
for showing a death gently, adding a spoken safety reminder, and picturing record-keeping before writing existed.

## Contents, in order

1. **Header**
   - title in Chinese and in English capitals;
   - file name (`NN-<故事名>-动画.html`, where NN is the story's two-digit number in its list or series, e.g. `02-女娲造人与补天-动画.html`; `<故事名>-动画.html` for a story on its own);
   - audience;
   - estimated length (the example was about 4½ min for 39 lines and 7 cards);
   - the voice plan in a sentence or two.
2. **比原文多加的内容** (additions beyond the source). List every addition. These are the standard additions, but they must still be listed each time:
   - a one-line prologue;
   - classical quotes on the chapter cards (shown on screen, not spoken);
   - small on-screen facts, such as 一丈 ≈ 一层楼;
   - an end card saying where the story first appears, plus, for a series, a teaser for the next story.
   - Anything else that is **spoken** isn't standard and needs its own question. Read any note for the parent in the source: example 03's said 不认识的东西一律不许往嘴里放, so the storyboard proposed a spoken 小提醒 · A LITTLE REMINDER card after the last line, and the user approved it. Number such lines after the story's own, so `check_text.py` can skip them with `--tail K`.
   - A note for the parent can also say what to leave out (for example, how someone was put to death, or how a system of succession changed). That becomes a question too: a gentle picture for the death, and a picture that shows only what the text says, explaining nothing.
   - A question for the child in the source can go on the end screen as 想一想 · THINK ABOUT IT, shown and not spoken, if the user agrees. An idiom from the story makes a good fact box.
3. **Title card**
   - the small line above the title, the title, and the English title;
   - background and music.
4. **Chapters** (about 5–6)
   - **Card:** 第N章 · 标题 · ENGLISH TITLE, plus the quote, its translation and its source. Some cards have no quote.
   - **Cues:** the chapter's narration lines, one entry each (format below).
5. **End card:** 完 · THE END, the source fact in Chinese and English, and the 下一集 teaser.
6. **Questions:** only real ones, such as an uncertain quote or an unclear moment in the story.

## One narration entry

```
**N.** <Chinese line: copied from the source, word for word>
<English line: plain English a 7-year-old can follow>
- **画面:** <background · what is drawn · the character's pose · camera>
- **音乐:** <section, only when it changes>
- **节拍:** <「word」 → what happens on that word>
- **Label:** <X → Y, when something turns into something else>
```

## Rules for the content

- **Chinese text:**
  - copy the source word for word;
  - split it only at sentence or clause breaks;
  - turn ASCII punctuation into full-width (，？！；：).
  - In a story-list page, each record's `x` field is the full text; `t` is the title, `h` the hook, `o` the outline, `q` a question for the child and `s` a note for the parent.
- **English:**
  - translate one line at a time;
  - keep names as pinyin (Pangu, Nüwa);
  - use ’ (curly apostrophe), never a straight `'`, because cue strings are wrapped in single quotes.
- **Quotes** on cards must be genuine classical lines with the source named. If you aren't sure a quote is real, leave that card without one; the example does this for chapter 2.
  - If the only fitting genuine line is violent (example 02: 「断鳌足以立四极」, cutting off the turtle's legs), leave that card without a quote too. The translation is on screen, and the audience is seven.
- **Gentle pictures.** When the old sources are harsher than the story text, draw what the story text says. Show harm without anyone hurt: people huddled on a hilltop, houses crossed out. Put the gentle version to the user as a question (example 02: the turtle's legs became pillars of light). The user approved this.
  - **When the story text itself has a death** (example 03: people who never woke up; the hero dying), still ask. The approved answers were a far dusk shot with no faces, and the hero sitting against a tree at sunset, eyes closed and calm, while leaves drift from his basket into the next scene. No pain is shown, and nothing literal about a harsh name like 断肠.
  - **When a note says to leave a death out**, don't show how. The approved answer: he walks away into the evening mist and is gone, with no ruler and no punishment, and the card quote stops before it. His spade stays behind and his son picks it up.
  - **A sad chapter can be softened with pictures only** (a father walks past his own door three times): the mother nods, the child waves, a speech bubble, and a short homecoming shot a chapter later. Ask first; none of it is spoken.
- **The character's look is a question** when tradition and the text disagree (example 02: Han reliefs give Nüwa a snake's tail, but the text has her walk and bend down, so she was drawn in human form). Base the proposal on what the text says she does.
- **Labels tied to a moment** (「小泥人 → 活了！」) belong to that word's beat, not the whole cue. A cue's `call` shows 0.6 s after the cue starts, so mark these as beats; the build sets them from the word event.
- **Plan where each prop goes afterwards.** Anything brought in (a clay figure, a vine, a pot, a big tree) needs a cue where it leaves. In example 02 the first clay figure was still standing by the forge two chapters later, and the pot glowed on the beach.
- **Backgrounds:** every chapter gets a background that fits its moment in the story. Never use plain black.
- **Beats to plan:**
  - a counter for numbers and spans of time;
  - a crossed-out drawing for "没有 X";
  - an "X → Y" label for transformations;
  - a lower-third fact box for units and customs;
  - a push-in or close-up for emotional lines;
  - silence, then a hit, for the climax;
  - a day/night time-lapse for long spans of time.
- **Music:** choose from the existing sections (`SECS` in the engine): title, chaos, egg, awaken, tension, build, impact (silence), divide, joy, worry, heroic, timelapse, grand, sad, magic, finale, end. For anything else, write "new section: …".

## How an approved storyboard becomes code

The engine is described in [engine-map.md](engine-map.md).

| Storyboard | In the page |
|---|---|
| Card line | a cue `{card:'ch1', dur:5.2, mood:'chaos', pal:[…]}`, plus the card text in `CARDS.ch1 = {no, t, en, q, qe, src}` |
| Chinese / English | a cue `{zh:'…', en:'…', pre, post, …}`. Each narration cue must **start its own line** with `{zh:'`, because `record.js` and `build_rec.py` find narration lines that way. |
| 画面 background | `pal:['dawn', 4.5, .6]` (palette name, duration, delay); palettes are in `PAL_SRC` |
| 画面 pose | `pose:[['kneel', 2.4], ['lie', 3.4, 2.3]]`; poses are in `POSES` |
| 画面 camera | `k:{camX:[…], camY:[…], camZ:[1.28, 9, 0, 's']}`. `'@hx'` / `'@hy+50'` mean the character's head. |
| 音乐 | `mood:'heroic'` (a `SECS` key) |
| 节拍 | `ev:[[{zh:'盘古', en:'Pangu'}, 'nameGlow']]` fires when the voice reaches that word; `ev:[[0.4, 'impact', {crack:[…]}]]` fires 0.4 s into the cue. Handlers go in `EV`, sounds in `SFX`. |
| 节拍 that changes pose, music or palette on a word | Example 02's engine adds `pose`, `pd`, `mood` and `pal` to an event's third item: `[{zh:'活了',en:'alive'}, 'alive', {alive:[1,1.2], mood:'joy'}]`. `stateAt` replays them when jumping (see engine-map.md, "Engine additions in example 02"). |
| Label | `call:{zh:'左眼 → 太阳', en:'LEFT EYE → SUN', at:'sun'}`; anchor positions come from `calloutAnchor()`. For a label on a word, set `G.call` in that word's `EV` handler instead. |
