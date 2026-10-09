---
name: story-documentary-animation
description: Turns a short story into one self-contained HTML animation in a classic nature-documentary style, with Canvas scenes whose backgrounds follow the story, a Web Audio orchestral score, a deep male Mandarin narrator (Edge's 云健, pre-recorded and embedded so Chrome sounds the same) and word-by-word Chinese + English subtitles, for a young child watching with a parent. Use when the user asks to 把某个故事做成动画 / 把下一个故事做成动画 / 做成纪录片风格的动画 / 像自然纪录片那样 / 画面、音乐、配音都用代码生成 / 配中英文字幕, or says "animate this story", "make a narrated story animation" or "turn this story into a documentary-style video page". Also use it to fix the voice, music, subtitles or scenes of an existing <故事名>-动画.html page made this way.
---

# Story → documentary animation

Each story becomes one page, saved next to its source:
- `NN-<故事名>-动画.html` when the story is number NN (two digits) in a numbered list or series;
- `<故事名>-动画.html` otherwise.

There's one page per story, in documentary style only. The audience is a young child (about seven) watching with a parent.

Everything is drawn and generated in the browser except the Chinese narration, which is Edge's 云健 voice recorded once and embedded in the page.

**Needs:** Windows, Google Chrome and Microsoft Edge (Edge supplies 云健), Node.js 22 or later (the tools use its built-in WebSocket; tested on 24), and Python 3 with Pillow (tested on 3.13). If a browser isn't in its default place, set `CHROME` or `EDGE` to its full path.

## Files, and when to use each

- [template/story-engine.html](template/story-engine.html): the starting point for every page. Copy it; don't start from scratch.
  - It holds a complete working story (盘古开天辟地) as its demo, without recordings. Every story part is replaced for a new page (engine-map.md, "Must change").
- [reference/storyboard.md](reference/storyboard.md): the checkpoint's format and rules.
- [reference/engine-map.md](reference/engine-map.md): read before editing. It covers:
  - what each section does, and what to keep, adapt or replace;
  - the cue format and the list of things that must change;
  - catalogues of the parts built for the examples, to lift into a new page.
- [reference/narration.md](reference/narration.md): voices, the recording pipeline and fallbacks. Read it before touching anything to do with voice.
- [reference/testing.md](reference/testing.md): every check's command and what a pass looks like, the visual-review list, test-setup quirks and timings.
- [example/](example/): three built stories without their recordings, safe to Read and grep, plus their approved storyboards.
  - [01-盘古开天辟地-无录音.html](example/01-盘古开天辟地-无录音.html): the first approved page; the template is this page. [storyboard.md](example/storyboard.md) is the storyboard to copy.
  - [02-女娲造人与补天-无录音.html](example/02-女娲造人与补天-无录音.html): a human character in robes, a perspective landscape with a river, crowds, a village, weather (storm, rain, flood, fire), a giant animal, a diagram. [storyboard-02.md](example/storyboard-02.md) has the questions on a character's look and on a violent detail, with the answers.
  - [03-神农尝百草-无录音.html](example/03-神农尝百草-无录音.html): a man in a leaf cape with a basket, a rock shelter, plant close-ups, a body diagram, a record card, a route map, an indoor shop, a book, a relay of generations, a spoken safety-reminder card. [storyboard-03.md](example/storyboard-03.md) has the questions on showing a death gently, a safety reminder and record-keeping before writing, with the answers.
  - Without recordings, these pages fall back to live browser voices, and their start screens say so. In a browser without a good Mandarin male voice, such as plain Chrome, they default to 女声. That's the fallback the embedded recording exists to avoid.
- [tools/](tools/): the commands are in testing.md.
  - **Checks:** check_syntax.py, fullrun.js, check_text.py (narration versus the source, word for word).
  - **Pictures:** shot.js, cue_jobs.py (screenshot jobs for every cue), contact_sheet.py, probe.js (the state behind a screenshot).
  - **Recording:** record.js, decodecheck.js, build_rec.py.
  - **Sound and voice:** levels.js, mixprobe.js (which bus is loud, over time), sec_peaks.py (a mixprobe log by music section, before and after a fix), liveRec.js, edgeRec.js.
  - **Editing:** splice.py (swap a whole section for a file), build_page.py (rebuild a page from the template plus section files, every time from scratch), strip_rec.py (a copy of a page without its recordings), doc_names.py (do the names a doc quotes exist in a page?).

## Workflow

1. **Source.** Take the story text from the user: pasted text, a text file, or a record in a story list.
   - A story-list page can hold one record per story with `t` (title), `h` (hook), `o` (outline), `x` (the full text, as a list of paragraphs), `q` (a question to ask the child) and `s` (a note for the parent). The Nth `"t":` in the file is story N. `check_text.py --story N` reads this format.
   - The narration is the full text word for word: one cue per sentence or clause, with full-width punctuation.
   - Translate each line into plain English.
   - Read any notes for the parent. A safety note, or a detail they're told to explain, may need a question at the checkpoint. A note can also say what to leave out (for example, how someone was put to death, or how a system of succession changed).
   - A question for the child (`q`) can go on the end screen as 想一想 · THINK ABOUT IT, shown and not spoken, if the user agrees. An idiom from the story makes a good fact box.
2. **Storyboard.** Follow reference/storyboard.md:
   - a title card and one prologue line;
   - chapter cards with genuine quotes from the old sources (or none);
   - every line with its 画面 (picture), 音乐 (music) and 节拍 (beats tied to words);
   - an end card with where the story first appears and, for a series, the 下一集 teaser.
   Flag everything added beyond the source.
3. **STOP: checkpoint.** Post the storyboard and wait for the user to approve it. Build and record nothing until then. After their changes, the approved Chinese text is final.
   - Ask real questions only, with a recommendation for each, such as:
     - how the character should look when tradition and the text disagree;
     - how to show a harsh detail from the old sources that the text leaves out;
     - how to show a death the text does include;
     - whether to add a spoken reminder when a note for the parent asks for one;
     - how to picture something the story's time couldn't have, like writing before writing existed;
     - how to show a death a parent note says to leave out;
     - how much to show of something a note says not to explain;
     - whether to soften a sad chapter with picture-only touches;
     - whether to show the question for the child on the end screen.
   - The example storyboards show these questions and the answers.
4. **Build.**
   - Copy the template to the page's file name.
   - Replace the story parts in engine-map.md's "Must change" list, one section per Edit (about 300 lines at most).
   - For big sections (the cues, all the scene code, the timeline), write them to scratch files and swap them in with `splice.py`.
   - Or keep every story section as a scratch file and rebuild the page from the template each time with `build_page.py` (one build did about 40 rebuilds, never a stale splice). Fix-ups become exact replacements on those files.
   - Look in the example pages for parts to lift before writing new ones.
   - Run `check_syntax.py` after each change.
   - A build takes hours. Post a one-line progress note at each phase so the user isn't left waiting in silence.
5. **Run the whole story.**
   - `fullrun.js` should visit every cue, reach the end and report no errors.
   - `check_text.py` should say the lines are the source word for word. Pass `--tail K` for approved spoken lines after the story.
6. **Look at every scene.**
   - Screenshot every cue with `shot.js` (`cue_jobs.py` writes the jobs), six per contact sheet.
   - Read each sheet, fix problems, reshoot. Plan on two rounds of fixes and a final pass to confirm: the examples needed about 25 fixes, then 10–12 (a bigger world: about 40, then 12, then 8). After the first full round, reshoot only the cues you changed, then do one full pass at the end.
   - Check each shot's subtitle to know which cue it really shows. Use `probe.js` when a shot doesn't match what you expected.
   - Also check a pose gallery, the start screen, the end screen (not frozen) and phone portrait (390×844).
7. **Record the narration** now, while the text is final: `record.js` → `decodecheck.js` → `build_rec.py`.
   - It can start as soon as the page has its final cues and run in the background while you fix pictures (about 5 minutes for 47 lines). Meanwhile edit code only; don't start other test browsers.
8. **Check the sound by measurement** (I can't hear):
   - `levels.js` must PASS, **and** its `output peak` line must be below 0 dBFS. PASS covers only the margin.
   - If the peak is high, run `mixprobe.js` from a cue or two earlier and let it play, to find the bus and the moment.
   - If word events switch the music mid-line (silence, then a hit into another section), levels.js never measures those switches: also run a whole-story `mixprobe.js` and `sec_peaks.py`.
   - `liveRec.js` (Chrome): the recording is the default, words light up, pause and resume work, and so does 试听.
   - `edgeRec.js … edge`: live 云健, 晓晓 for 女声, and the fallback to the recording. Also run `edgeRec.js … chrome`.
9. **Final checks.**
   - Run check_syntax and fullrun again, and take a start-screen shot.
   - Make sure no `sda-*` test browsers or profiles are left, and nothing extra sits next to the page.
10. **Report,** in the user's language:
    - what was built, and what was verified, with numbers;
    - what was added beyond the source, including picture-only choices made while building;
    - any engine bug found, and whether older pages still have it;
    - "I can't hear audio; please listen in Chrome";
    - press F5 on any page that is already open.

## Building through a subagent

The user may ask for agents to build stories. For two at once, see testing.md, "Two stories at once". The main conversation stays the only one that talks to the user: a subagent's report isn't shown to the user, and it can't post progress notes.
1. **Storyboard phase.** Launch the agent with:
   - the skill path, and "read SKILL.md first";
   - its own scratch folder, and the one page file it may write;
   - "don't edit the skill folder; propose changes in the report";
   - "steps 1–2 only, then stop; save the storyboard in the scratch folder";
   - "make the final message the storyboard exactly as it should be posted, then the questions; put notes for the lead in a separate section".
   Hand over whatever you already know: a cue split, candidate quotes, the questions. Ask the agent to verify and improve them; it caught a wrong cue count and checked each quote online.
2. **Before posting it,** check its Chinese lines against the source yourself: join the numbered lines after the prologue and compare them with the source, using check_text.py's rule. Then post the storyboard in full, with your own one-line note that you checked it.
3. **After approval,** resume the same agent with the answers, and tell it the approved text is now final. Name any approved lines beyond the source (the `--tail` for check_text.py). Ask for the step-10 report, with notes for the lead kept apart.
4. **Before reporting to the user,** check the work again:
   - re-run check_syntax and fullrun;
   - look through the final contact sheets and the start screen;
   - read the logs from levels, liveRec, edgeRec and build_rec;
   - check that no `sda-*` browsers are left.
   A second look has found framing problems the agent didn't report (a figure cut off behind the fact box).
5. **Timing:** a storyboard took an agent about 11 minutes, and a build about 80 (130 tool calls). Tell the user when each phase starts and ends. If the user changes the plan while an agent runs, stop the cancelled agent at once and check that it left no files.
6. **Skill changes:** the agent proposes them, and the main conversation applies and tests them afterwards.

## Fixing an existing page

- **Fix only what the user asked for.** An engine fix that changes behaviour stays out of an approved page unless that page needs it. For example, the card-event fix isn't needed on a page whose cards have no events; check before deciding.
- **Back up the page** into the scratch folder first.
- **Edit with a small Python script** of exact replacements, each asserted to occur once. Never Read a page that has recordings: one line is about 1.5 MB.
- **Keep copies in step:** if a copy of the page without recordings exists, apply the same script to it or remake it with `strip_rec.py`. Compare md5 sums where two files should be identical.
- **Show the symptom before and after:**
  - for a visual fix, a screenshot of the same cue, desktop and phone;
  - for an audio fix, the same whole-story `mixprobe.js` run on both versions, compared with `sec_peaks.py` (see testing.md).
  Then run check_syntax, fullrun and, for audio, levels.
- **Remind the user** to press F5 on any open copy, and to listen, since I can't.

## Rules

- **Documentary style is the standard:**
  - a background chosen for each story moment, never plain black;
  - chapter cards with genuine quotes (or none);
  - counters, crossed-out drawings, "X → Y" labels and a fact box;
  - push-ins and close-ups;
  - rim light, glow, lens flare, vignette and film grain;
  - an orchestral score by section, with silence before the big hit.
  A plain cartoon isn't enough.
- **Narration text** is the source word for word. Flag every addition in the storyboard.
  - The prologue, card quotes, small facts, end note and teaser are the standard additions.
  - Anything else spoken needs the user's OK each time, for example a spoken 小提醒 · A LITTLE REMINDER card after the last line when a note for the parent asks for it.
- **Gentle for a young child:**
  - When the old sources are harsher than the story text, show what the story text says.
  - Show danger without anyone being hurt.
  - Leave a card without a quote rather than show a violent line.
  - Proposals that were approved:
    - a violent act became a transformation in light (a giant turtle's legs became pillars of light; no cutting);
    - a death in the story became a far shot at dusk with no faces;
    - a hero's death: he sits against a tree at sunset and closes his eyes, calm, while leaves drift from his basket into the next scene. No pain, and nothing literal in a harsh name.
    - a death a parent note says to leave out: he walks away into the evening mist and is gone; no ruler, no punishment, and the card quote stops before it;
    - a sad chapter (a father keeps walking past his own door) softened with pictures only: the mother nods, the child waves, a speech bubble, a short homecoming shot a chapter later;
    - something a note says not to explain (a change in how rulers succeeded): show only what the text says, as a plain chain, with no terms on screen.
- **The voice drives the timeline.** Each line is spoken to the end before the next cue starts. Effects are tied to words, not to seconds.
- **Voices:**
  - The default narrator is a deep male voice everywhere: live 云健 in Edge, and the embedded 云健 recording in Chrome and other browsers. 云健 comes before 云扬, at pitch ≈ .86.
  - 女声 is the browser's best female voice. English is live, preferring a British male voice.
  - No Cantonese voices (zh-HK, yue) for Mandarin text.
  - Kangkang never counts as male: in browsers it comes out at about 195 Hz, and even at its lowest pitch it sounds poor. Changing pitch can't fix a bad voice.
- **Browsers:** Chrome is the main target, because double-clicking a page usually opens it in Chrome. Always test both Chrome and Edge, and Chrome first.
- **Judging voices:** never decide a voice's gender from its name or the Windows registry, and never claim it sounds good. Measure it, and ask the user to listen.
- **No browser-switching workarounds:** don't offer "open in Edge" links, shortcuts or copy-the-address buttons (`microsoft-edge:` links can't open local files anyway). The embedded recording is the fix.
- **One self-contained file.** Only Google Fonts load from outside, with fallbacks. The page describes itself truthfully: the footer says the narration is pre-recorded.
- **Tests never make sound:** stub `speechSynthesis.speak`, and keep test browsers and the recorder muted.
- **Recording rights:** never read or reuse Edge's service key. The recording is for private use; check Microsoft's terms before anything public.
- **Changing a default:** bump the saved-setting keys so old saved choices can't override it.

## Pitfalls (each of these happened)

**Engine and audio** (details in engine-map.md):
- Writing a whole page in one go hit the output-token limit. Replace one section per Edit.
- Dipping the music by a fixed half left only 2 dB between voice and music in loud scenes. The engine dips it by measured loudness.
- A loud crack clipped. The engine has a compressor and limiter.
- **A +15 dBFS blast when one music section flowed into the next:** `setSection` faded notes queued to start later from the default gain of 1. A direct jump to the loud cue sounded normal; only `mixprobe.js`, letting the story flow, found it. The template has the fix.
  - A clean play-through doesn't prove the bug is gone: it depends on timing.
- **A louder peak after a fix isn't always a regression:** one read −4.1 dBFS before and −1.1 after, but the music bus was the same in both runs; the 250 ms sample had fallen on a sound effect plus a loud word. Check which bus is loud before undoing anything.
- English apostrophes rendered full-width ("didn’ t") in the CJK body font. The template gives English text a Latin font first; check an English line with ’ in the screenshots.
- Chapter cards couldn't fire timed events, and a delayed tween snapped back to the value it had when queued. Both are fixed in the template.

**Voice** (details in narration.md):
- A version defaulted to a female voice, and another ranked 云扬 above 云健. Deep male comes first.
- Edge names its voices in Chinese (云健); matching only pinyin missed them, so Edge fell back to Kangkang.
- Google voice names contain a non-breaking space.
- Old saved settings kept an old voice selected. Bump the keys.
- Testing only in Edge missed that Chrome defaulted to a poor voice, which is why pages embed the recording.

**Tests and tools** (details in testing.md):
- Headless Edge gives no animation frames and slows timers to once a second, so its test advances the story by elapsed time. An earlier test "passed" without ever reaching a spoken line.
- Piping a tool into `head` killed it and left a browser running.
- A click made by script doesn't count as the user clicking. Use real mouse events.
- Bash heredocs ate backslashes and failed on markdown, and the console garbled Chinese. Write scripts and doc text with the Write tool.
- The recorder took keywords and labels for narration lines, and missed a cue whose Chinese and English were on separate lines. Hence the rule that a cue starts its own line.
- levels.js once jumped to the title after Play had started it, so the opening hit played twice and read about 5 dB too loud. Fixed in the tool.
- A job list with Windows line endings crashed `shot.js` and left a browser running.
- A screenshot "missing" a label had landed in the next cue: debug timing is shorter than the voice.
- A parts catalogue written from a subagent's report named a row that wasn't a greppable name. Check catalogues with `doc_names.py`.

**Pictures** (details in testing.md, "What to look for"):
- Backgrounds: black everywhere looked flat. Chaos looked like a starfield, mountains like a block or pale triangles, a rock shelter like a dome or a beehive. Water reflecting a warm sky looked like a road, and a flood vanished under a dark storm palette.
- Close-ups blew up the background into blobs until far layers got their own parallax and the sky gradient was anchored to the horizon.
- Characters:
  - glow plus rim light on pale clothes washed them out;
  - rim light drawn per part showed lines inside the body;
  - feet poked through a shell;
  - ribbons hung like cords;
  - a kneeling robe became a cushion;
  - hair on a bent head looked like a beak, and thin hair looked bald;
  - a beard hid the mouth;
  - a back basket was drawn over the chest;
  - seated poses floated.
- Props stayed on screen chapters after their scene, and randomly placed huts landed in the river. Every prop needs a cue that takes it away.
- Overlays:
  - the sun sat behind a checklist;
  - a fact box covered a face;
  - labels stacked, or pointed at the wrong star;
  - the glow canvas shone through a full-screen map;
  - a reminder card stayed under the end screen.
- The start screen had overlapping text, a scrollbar and a footer that wasn't true.
- Default smiles looked wrong on people in hard times.

**Found in later builds** (details in testing.md):
- **`spr()` leaves the canvas alpha set** to the sprite's alpha, so whatever a function draws after a glow sprite comes out faint (a tree beside a glowing window was a ghost). Set `g.globalAlpha` again after a glow block. The template's `spr()` is unchanged because approved looks depend on it.
- **Water drawn as a box over things standing in it** showed pale rectangles. Clip them at the waterline instead, so the water behind shows through, with at most a faint ring.
- **People taller than their huts**, and cone huts scaled up into tipis: people 200·dS, huts 300·dS as low round huts with a big roof.
- **A long earthen wall behind a village was invisible** until it got more height, a higher camera, texture, and the huts moved aside.
- **Hair on the eyes** read as a mask; **white beards covered old faces**. Leave a strip of forehead; start the beard below the mouth and keep hair light grey.
- **Close map markers' labels overlapped:** give each its own side.
- **A Chrome voice check listed no Google voice** (they load over the network), so 女声 fell to Huihui. `edgeRec.js` now waits for the voice list to settle.
- **A frozen end-screen shot kept the last card on screen:** `&freeze` stops the fades `finishStory` starts. Shoot the end screen unfrozen.

## Self-audit before reporting

- [ ] The user approved the storyboard, and the page's Chinese lines match it exactly (`check_text.py` says OK, with `--tail` for approved lines after the story).
- [ ] check_syntax passes. fullrun visits every cue, reaches `done`, and reports no errors.
- [ ] I looked at every cue's screenshot, plus the pose gallery, start screen, end screen (not frozen) and phone portrait.
- [ ] Nothing from an earlier scene is still on screen where it shouldn't be.
- [ ] Every narration line is recorded, decodes and is embedded (`build_rec.py` reported no missing lines).
- [ ] levels.js passes (at least 9 dB everywhere), and I read its `output peak` line: below 0 dBFS.
- [ ] Chrome:
  - 「♂ 云健（录音）」 is the default and the depth slider is dimmed;
  - the note and footer are truthful;
  - words light up and pause/resume keeps the place;
  - 试听 plays, and Play stops it.
- [ ] Edge:
  - live 云健 is the default, and 女声 is 晓晓;
  - no Cantonese voices are listed;
  - the fallback to the recording works and the story continues.
- [ ] No sound played during testing, and no test browsers, profiles or stray files are left.
- [ ] The report lists what was verified and what was added, and asks the user to listen.
