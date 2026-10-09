# Checks: commands, what a pass looks like, test-setup quirks

Every check here was run on example 01 (the first approved page) and on the template. The helpers added in example 02 (`splice.py`, `cue_jobs.py`, `probe.js`, `mixprobe.js`) were run on the example 02 page. The ones added after example 03 were run on real files: `strip_rec.py` remade the 03 example byte for byte, `sec_peaks.py` compared Pangu before and after its fix, and `doc_names.py` checked every catalogue in engine-map.md.

**Requirements:**
- Node ≥ 22 (tested on 24.18) for the built-in `WebSocket`.
- Python 3 with Pillow (tested on 3.13 / Pillow 12.3).
- Chrome and Edge at their standard Windows install paths; override with the `CHROME` / `EDGE` environment variables.

**How the tools run:** each tool launches its own headless browser (`--headless=new --mute-audio`) with a temporary profile `%TEMP%\sda-*`, and deletes it at the end. Screenshot jobs are `"<debug hash>|<out.png>[|wait ms]"`; the `|` is a real pipe character inside the quotes.

```bash
T=<skill folder>/tools          # e.g. .claude/skills/story-documentary-animation/tools
python $T/check_syntax.py page.html                                     # after every edit
node $T/fullrun.js page.html shots/start.png                            # whole story, fast-forwarded, plus a start-screen shot
node $T/shot.js page.html 1280 720 "at=4:3&freeze|s04.png" "at=5:6&freeze|s05.png"      # visual review
python $T/contact_sheet.py sheet1.png s04.png s05.png                   # six shots per sheet, then Read the sheet
node $T/shot.js page.html 390 844 "at=6:5&freeze|m06.png" "|m-start.png"                # phone portrait + start screen
node $T/shot.js page.html 1280 720 "at=45:9|end.png|4500"               # end screen: the last cue index, 9 s in; NOT frozen (freeze stops the fades finishStory starts)
node $T/record.js rec page.html && node $T/decodecheck.js rec && python $T/build_rec.py rec page.html
node $T/levels.js page.html                                             # mix check (needs the recordings)
node $T/liveRec.js page.html 40                                         # Chrome playback of the recording
node $T/edgeRec.js page.html edge > edge.txt; node $T/edgeRec.js page.html chrome > chrome.txt   # voice choice + fallback
# helpers added in example 02
python $T/splice.py page.html "<start marker>" "<end marker>" new.js     # swap a whole section for a file's contents
mapfile -t JOBS < <(python $T/cue_jobs.py page.html shots) && node $T/shot.js page.html 1280 720 "${JOBS[@]}"   # every cue
node $T/probe.js page.html "at=39:6&freeze" "JSON.stringify({cue:RUN.i, x:P.stones})"   # the state behind a screenshot
node $T/mixprobe.js page.html 42 26                                     # levels every 250 ms while the story plays on
python $T/check_text.py page.html story.txt --tail 1                  # narration vs source text (or: list.html --story N)
# helpers added after example 03
python $T/strip_rec.py page.html example/NN-<故事名>-无录音.html        # a copy without the recordings, for example/
node $T/mixprobe.js page.html 0 330 > before.txt                       # the whole story, played through (about 5½ min)
python $T/sec_peaks.py before.txt after.txt                             # loudest music and master at each section change
python $T/doc_names.py reference/engine-map.md example/03-…-无录音.html "## Parts built for example 03"   # do the named parts exist?
python $T/build_page.py spec.json                                       # rebuild the page from the template + section files (format in its header)
```

| Check | Pass looks like |
|---|---|
| check_syntax | every script `OK` (the main script, plus `rec-data` once the recordings are embedded) |
| check_text | `OK: the compared lines are the source text word for word`. The source is a text file, or a story-list page with `--story N`. `--prologue P` (default 1) and `--tail K` (default 0) are the spoken lines before and after the story that aren't in the source; they're printed so you can check them against the storyboard, but not compared. Example 03 needs `--tail 1` (its reminder); without it, it reports `MISMATCH at character 582`, where the reminder starts. |
| fullrun | `phase:"done"`, `cuesVisited == cues`, `thrown:null`, `errors: none`. Example 01: 46/46 cues, 272 s of story, runs in about 8 s. Then look at the start screen. |
| shot + contact_sheet | every job prints `ok`; then **look** at each sheet (list below) |
| phone / end screen | subtitles, cards and the start screen fit with no overlap. End screen shows 完 / THE END, the source fact and the next-episode line. |
| record → decodecheck → build_rec | every line `ok` with a `turn.end`; `0 failed`; `N narration lines embedded` |
| levels | When word events switch the music mid-line, levels.js never measures those switches: also run a whole-story mixprobe (one such story: 9.8–18.7 dB and −3.8 dBFS here, −3.4 in its mixprobe over 35 sections). `PASS`, **and** the output peak is below 0 dBFS; the tool prints PASS for the margin alone, so read the peak line yourself. The voice must be at least 9 dB above the music in every section with speech. Example 01: 9.3–14.8 dB (quietest is the soft line in *sad*), peak −0.3 dBFS; after its section-change fix, measured with the fixed tool: 9.0–14.8 dB, peak −1.8 dBFS (the axe strike: effects plus voice). Example 02: 11.3–15.5 dB, peak −0.7 dBFS, after fixing a +15.4 dBFS burst. Example 03: 11.8–15.4 dB, peak −3.1 dBFS (title −4.7). **Until example 03 the tool jumped to the title again right after Play**, so the opening hit played twice on top of itself: example 03's title first read +0.2 dBFS, and about −4.7 when played once. It now lets the first section play and attaches its meters as soon as the audio exists; the Pangu and example 02 numbers above were measured the old way. The peak is measured at `AU.master`, *before* the compressor and limiter, so anything over 0 is being crushed and will be heard as a blast. To find it, run `mixprobe.js` starting a cue or two before the loud window and let it play. A fresh jump to the loud cue sounded fine; the burst only came as the music flowed from one section into the next. |
| liveRec, edgeRec | listed below |

**liveRec pass:**
- setup:
  - `voice: "Microsoft 云健（录音）"`;
  - first option `♂ 云健（录音） · zh-CN`;
  - `depthDisabled: true`;
  - the recording note and the pre-recorded footer;
  - `noRecording: []`.
- preview: `src: true` with a duration.
- playback: cues go card → pre → speak (`rec: true`, `lit` rising) → post → next.
- pause: after 2 s paused, `ac: "suspended"` and `lit` unchanged; after resume it continues from there.
- `spoke` stays at 1 (only the silent unlock call); `errors: none`.

**edgeRec pass:**
- the first line, `A voices in the browser: N`, comes after the tool has waited for the list to stop changing (Chrome ≈ 25 with the Google voices, Edge ≈ 330). Before that wait, one Chrome run listed no Google voice and 女声 fell to Huihui; a second run was fine.
- **Edge:**
  - `pick` is `Microsoft 云健 Online (Natural)…`;
  - the 女声 choice is `Microsoft 晓晓 Online…`;
  - no Cantonese voices listed;
  - in part B, after the simulated network error, `rec: true`, `lit` rises and the story reaches the next cue.
- **Chrome:** `pick` is `Microsoft 云健（录音）`, `depthOff: true`, and the 女声 choice is `Google 普通话…`.

## Debug hash (for screenshots)

`page.html#at=CUE[:SEC][&freeze][&force=POSE]`:
- turns narration off;
- jumps to cue index `CUE` (counting cards; it's the index in `CUES`, not the storyboard number);
- fast-forwards `SEC` seconds;
- `freeze` holds the frame;
- `force=POSE` shows any pose (useful for a pose gallery: same cue, one shot per pose, `--crop` in `contact_sheet.py`).

An empty hash (`"|start.png"`) shows the start screen.

## What to look for in the visual review (every one of these went wrong at least once)

- The character stays **inside** anything that contains them (the egg shell): no feet or props poking through.
- Props and effects don't cover the face; the crack and light rays were first drawn across his face and had to move **behind** him.
- Each background reads as what it's meant to be; the ink-in-water chaos first looked like a starfield.
- Large shapes have form: the mountains first came out as one flat block.
- After jumping straight to a close-up, the camera still frames the face (`'@hx'` targets are resolved after the character update in `stateAt`).
- The rim light follows the outer outline only, with no lines inside the body.
- Labels point at the right thing: one star label fell back to a star at the far left.
- Text is readable: subtitles over bright scenes, and the fact box has its dark backing.
- **Start screen:**
  - no text overlapping (the fix was `.overlay{justify-content:safe center} .overlay > *{flex:none}`);
  - no scrollbar;
  - the note fits on one line;
  - the disabled slider is dimmed;
  - the footer tells the truth about how the narration is made.
- Phone portrait (390×844): cards and subtitles fit.

**Added after example 02** (the first round of its screenshots found about 25 problems and the second about 10; plan on two rounds):
- **Which cue is this?** Read the subtitle in each shot. Debug-hash timing uses the silent estimate, which is shorter than the voice, so a shot 70% of the way into a line can land in the next cue. A missing label turned out to be fading out in the next cue; `probe.js` showed that.
- **Props left behind:** look for things from earlier scenes that should be gone. In example 02: the first clay figure next to the forge, the vine still in her hand, a glowing pot on the beach, the vine tree in the middle of the village.
- **Close-ups:** the background should stay calm. Mountains blown up into blobs, or dark zenith colour between the peaks, mean a missing `withFar` or a sky gradient not anchored to the horizon.
- **The character keeps detail:** no white-out from glow or rim light, and robes that don't balloon when kneeling. Ribbons and hair should read as cloth and hair, not cords or spikes.
- **Things read as what they are:** water should look like water (blue, not a beige road); cracks should look like cracks (zigzags toward the viewer, not glowing horizontal bars); a flood should look like water under a dark palette; a hole's waterfall shouldn't have a hard top edge.
- **Patches and after-effects fade:** a mended patch or a fading object should end nearly invisible, not stay a garish shape for the rest of the story.
- **Top overlays clear:** the checklist, fact box and counter don't cover the sun, the moon or the face.
- **Pose gallery:** every pose, same cue, with `&force=NAME`: `--cols 5 --size 256x288 --crop 380,40,860,580` for a 1280×720 mid shot.

**Added after example 03** (about 25 fixes in the first round and about 12 in the second, then a third pass to confirm):
- **English punctuation:** find an English line with ’ or “ ” and check that it isn't drawn full-width ("didn’ t"). The Latin font on `.en` and `#lower .l3` fixes this; English drawn on the canvas needs a Latin font first too.
- **Full-screen overlays** (a map, a room) show no ghost of the character from the glow canvas.
- **Labels and tags** over things close together don't stack; two labels in one cue don't overlap.
- **Faces fit the mood:** no default smiles in scenes of hardship.
- **Effect marks** (ache squiggles, heat lines) aren't hidden behind the next figure.
- **Props follow the body:** a back basket stays on the back when he bends, and comes off before he lies down; seated poses sit on the rock, not above it.
- **Backgrounds:** mountains need ink and contrast, not pale flat triangles. A rock shelter should read as rock, not as a dome, a haystack or a beehive. Nothing grows inside a cave.
- **Overlays against subjects:** the fact box doesn't cover a close-up face or the object the line is about. The end screen has nothing left under it (the reminder card stayed until `finishStory` faded it).

**Added after a later build** (about 40 fixes in the first round, 12 in the second, 8 in the third, then a final full pass):
- **Things in water:** no pale boxes or bright ovals at waterlines; huts and people are clipped there (`sunk()`).
- **Scale:** people are shorter than their huts, and huts don't read as tents; the thing the story is about (a dyke) isn't hidden behind huts.
- **Faint objects:** anything unexpectedly see-through was drawn after a glow sprite that left the alpha low (`spr()`).
- **Faces:** hair doesn't sit on the eyes; white beards don't cover old faces.
- **Labels on maps and diagrams** don't overlap each other or the figures.
- **Phone portrait:** side-by-side panels (two lenses, a chain) fit when stacked or shrunk.
- **The end screen**, shot without `freeze`, has nothing left on it from the last cue.

## Test-setup quirks (each one cost time)

- **Never pipe a tool into `head`.** The pipe closes early, the tool dies before it can close its browser, and it leaves a headless browser and a profile behind. This happened twice. Redirect to a file (`> out.txt`) and read that instead.
  - To clean up only the test browsers, never the user's own:
    `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | ? { $_.CommandLine -like '*sda-*' } | % { Stop-Process -Id $_.ProcessId -Force }`
    then delete `%TEMP%\sda-*`.
- **Clicks that start audio or use the clipboard** must be real input events: `Input.dispatchMouseEvent` pressed and released. `element.click()` from a script doesn't count as the user clicking.
- **Headless Edge treats the page as hidden:** no animation frames, and timers slow to about one tick a second.
  - Fake `document.hidden` / `visibilityState` before the page loads (`Page.addScriptToEvaluateOnNewDocument`), otherwise the page pauses itself.
  - Advance the timeline by the **real time that has passed** (`edgeRec.js`). A fixed 1/30 s per tick crawled so slowly that an earlier run never got past the title card.
  - Headless Chrome doesn't have this problem.
- **Never let a test speak:** stub `speechSynthesis.speak`. Windows voices ignore `--mute-audio`.
- **Write test scripts with the Write tool, not Bash heredocs.** Heredocs ate the backslashes in inline JavaScript and regexes.
- **Windows line endings in job lists:** a Python job list piped into `mapfile` carried a `\r` into the last part of each job, the file name. `shot.js` crashed on it and left a headless browser running. `cue_jobs.py` prints plain `\n`; for other lists, pipe through `tr -d '\r'`. After any crash, run the clean-up command above.
- **Chinese in the console:** the Python tools print UTF-8. For other Python output, set `PYTHONIOENCODING=utf-8`, or Chinese comes out garbled.
  - A Chinese file name typed into `python -c` arrived garbled and the file wasn't found. Put the code in a script (Write tool), find the file with `glob('*<part of its name>*.html')`, and write Chinese output to a UTF-8 file, then Read it.
- **Doc text in heredocs:** a Bash heredoc holding a markdown table failed to parse. Write the text with the Write tool and append it with `cat file >> doc.md`.
- **Other programs playing sound don't affect the checks** (a video played during one build's probes): the test browsers are muted and measure inside the page, and record.js takes Edge's voice data, not the speakers. Only CPU load can slow a real-time probe; check that it still reached the end.
- **While record.js runs, edit code only.** Its Edge and the other tools' Chrome use overlapping debug-port ranges.

## Measuring an audio fix (Pangu's section-change fix, after example 03)

1. Build the fixed page as a copy in the scratch folder; leave the real page alone for now.
2. Run `node $T/mixprobe.js page.html 0 330 > before.txt` on the current page, then the same on the copy (`after.txt`).
   - Run them one after the other, not side by side, so they don't compete for the CPU. Each plays the whole story in real time, about 5½ minutes, so run it in the background and tell the user.
3. Run `python $T/sec_peaks.py before.txt after.txt`. Each music change should be as quiet or quieter after the fix.
4. Any louder number: find its row in the log and see which bus did it.
   - Pangu's axe strike rose from −4.1 to −1.1 dBFS, but the music bus was −28.7 in both runs; the 250 ms sample had simply fallen on the crack plus a loud word.
5. Copy the fix into the page and its `example/` copy. Then run check_syntax, fullrun and levels.js (Pangu after its fix: 9.0–14.8 dB, peak −1.8 dBFS).
- **A clean "before" doesn't mean the fix isn't needed.** Pangu never blasted before its fix: the loudest music at a change was −4 dBFS. The bug only bites when a note is queued in the ¼ s before a change.

## How long things take (example 03 and a later build, on a Windows 11 PC)

| Step | Time |
|---|---|
| fullrun | 9–17 s |
| levels.js | about 3½ min |
| mixprobe, whole story | about 5½ min (a 6-minute story: about 7) |
| levels.js, a story with about 30 music sections | about 5 min |
| record.js, 47 lines (223 s of speech) | about 5 min, run in the background while editing code |
| shot.js, 55 cues at 1280×720 | about 2–3 min |
| a build in the main conversation (storyboard approved → final checks) | about 3 hours, four screenshot rounds |
| storyboard by a subagent | about 11 min |
| build by a subagent, from the template through the final checks (130 tool calls) | about 80 min |
- **Look at screenshots in contact sheets**, six at a time, to save context. Don't `Read` the example page or the `rec-data` line (about 1.5 MB).

## Two stories at once (subagents)

The user may ask for two stories to be built in parallel. Each storyboard still goes to the user first, and nothing is built until it's approved: a subagent drafts it, the main conversation posts it, and the subagent is resumed with the answers. The tools weren't written for two builds at once:
- **The clean-up command above kills every `sda-*` browser**, including the other build's. While two builds run, each may stop only processes whose command line contains a profile it launched itself (for example `sda-shot-9412`). The main conversation does the global clean-up once both are finished.
- **Record one story at a time.** Before starting `record.js`, check that no `msedge.exe` has `sda-record-` in its command line.
- **Debug ports are random, in overlapping ranges** (fullrun and mixprobe both use 9600–9689, for example), so a clash is possible. If a check reports a connection error, the wrong page or the wrong cue count, run it again before trusting it.
- Give each build its own scratch folder, and let only one of them write in the skill folder: the main conversation, after both are done.
