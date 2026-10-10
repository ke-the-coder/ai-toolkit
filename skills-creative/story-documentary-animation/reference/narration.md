# Narration: voices, recording, fallbacks

## The approved voice plan (don't change it without asking)

| Browser | Chinese narration (default: 低沉男声) | 女声 option | English narration |
|---|---|---|---|
| **Chrome** (the user's default; double-clicking an .html file opens Chrome) | the **embedded recording** of Edge's 云健, shown as 「♂ 云健（录音）」, first in the list | Google 普通话 | live browser voice |
| **Edge** | live **Microsoft 云健 Online (Natural)**; if it fails (for example offline), that line plays from the recording | Microsoft 晓晓 Online | live, British male voice preferred (Ryan, Thomas…) |

- **Settings:**
  - live Chinese is spoken at rate .84 and English at .86;
  - pitch comes from the 低沉 Depth slider (`narrPitch = 1.02 − depth × .0045`); the default depth is 35 for male (pitch ≈ .86) and 10 for female;
  - the recording was made at rate .85 and pitch .86.
- **When the recording is the voice:**
  - the depth slider is disabled and dimmed, because a recording's pitch can't change;
  - the note reads 「这个浏览器没有好听的中文男声，改用事先录好的“云健”旁白。」;
  - the footer reads 「画面和配乐由浏览器实时生成，旁白是事先录好的」. Keep UI text truthful.
- **Confirmed by ear on example 01:** the Chrome recording, English narration and 女声.

## Voice facts (this Windows 11 machine, measured this session)

- **Chrome on Windows has no good Mandarin male voice.** It offers:
  - Windows' own Huihui (female), Yaoyao (female) and **Kangkang**;
  - Google 普通话 / 國語 / 粵語 (all female).
- **Kangkang is not male in practice.**
  - Windows lists it as male, but through the browser's SAPI path it comes out at about 193–197 Hz, which sounds female.
  - Chrome turns `utterance.pitch` p into SAPI `absmiddle = p×10 − 10`. Even at the lowest setting (≈146 Hz), the user found it too ugly.
  - The code (`sapiLow`, `hasGoodMale`) never counts it as a good male voice. Don't try to rescue it with pitch.
- **Edge's online voices** have Chinese names, for example `Microsoft 云健 Online (Natural) - Chinese (Mandarin, Simplified)`.
  - Male, deepest first: **云健**, then 云扬 (a news-reader style), then 云希. 云夏 is a child's voice and is excluded.
  - Female: 晓晓 and 晓伊.
  - Also present: dialect voices (zh-CN-liaoning, -shaanxi) and Hong Kong and Taiwan voices.
  - These voices need an internet connection.
- **Google voice names use a non-breaking space** (`Google 普通话`), so match them with `\s`.
- **Cantonese is excluded** from Mandarin narration: zh-HK, zh-MO, yue, and any name containing 粤/粵/Cantonese (`isCantonese`).
- **Word-by-word subtitles:** Microsoft voices (SAPI and online) report word timings; Google voices don't. The recording carries its own timings.
- **`microsoft-edge:` links can't open local files.** Every format tried opened a blank tab.

## How the page picks a voice

- `scoreVoice()` ranks voices for the chosen 音色. For male:
  - male +60, female −30, unknown −10, child −45;
  - zh-CN +50, Taiwan +18, regional dialects −30;
  - 云健 +36 > 云泽/云野 +32 > 云扬 +28 > 云枫/云皓 +22 > Li-mu +18 > Kangkang +14 > 云希 +12;
  - online/natural +25, Google +14.
- **Result:** live 云健 **173** > recording **146** > Kangkang **124**. So Edge picks live 云健, and Chrome picks the recording.
- **`autoGender()`:** if the browser has no good male voice and no recording, the default switches to 女声 and a note explains why.
- **Saved choices:** if the user picked a voice by hand, it's saved and wins over the ranking. When you change a default, bump the saved-key suffix (`gen6` → `gen7`, `depth6`, `vzh6`, `ven6`) so old choices don't override the new default.

## Recording pipeline (Windows + Edge + internet)

```
node tools/record.js <recDir> <page.html>        # about as long as the narration plus ~1 s per line; silent (Edge runs muted)
node tools/decodecheck.js <recDir>               # every line must decode ("0 failed")
python tools/build_rec.py <recDir> <page.html>   # embeds <script id="rec-data">window.STORY_REC = …</script>
```

- **Which lines:** `record.js` records every narration cue, meaning every line of the page that **starts** with `{zh:'…', en:'…'`. Word anchors (`{zh:'太阳',en:'sun'}` inside `ev`) and labels don't start a line, so they aren't recorded.
  - Dashes (—) are spoken as pauses.
  - Output: `NN.webm`, plus `manifest.json` `{voice, rate, pitch, format, lines:[{text, file, bytes, bounds:[[charIndex, charLen, seconds]…]}]}`.
- **How it works:**
  - Hidden, muted Edge speaks each line with 云健 through the normal Web Speech API.
  - Edge's built-in Read Aloud component (`jdiccldimpdaibmpdkjnbmckianbfold`) receives the audio over a WebSocket: binary `Path:audio` frames of `webm-24khz-16bit-mono-opus`, `Path:audio.metadata` WordBoundary messages (Offset in 100-ns units), and `Path:turn.end`.
  - `record.js` attaches to that component through the DevTools protocol (`Target.attachToTarget` + `Network.enable`) and reads `Network.webSocketFrameReceived`.
  - It never reads or reuses Edge's service key. Nothing plays aloud; the user confirmed silence during recording.
- **Size:**
  - Example 01 (盘古): 39 lines, 177.6 s, 1,117 KB of audio, 1,495 KB as base64. The page grows from 170 KB to 1.7 MB.
  - Example 02: 45 lines, 203 s, 1,277 KB of audio, 1,710 KB as base64. The page grows from 212 KB to 2.0 MB. Recording took about 5 minutes and every line decoded first time.
- **Matching:** the recording's key is the **exact Chinese text**.
  - If you change a line, re-record; `build_rec.py` refuses to embed while any narration line has no recording.
  - A line with no recording plays silently, with subtitles and estimated timing.
- **Playback:** `playRec()` decodes the audio (`decodeAudioData`, cached, 3 lines ahead) and plays it into `AU.vIn`. The next cue starts on `onended`. Words light up by comparing the recorded timings with `AU.ac.currentTime`.
- **Pause:** with the recording, pausing suspends the AudioContext, so it resumes from the same place. A live voice restarts the line instead.
- **Rights:** this is Microsoft's voice. It's fine for the family; check Microsoft's terms before publishing anything publicly.
- **Other systems:** the recording path has only been tested on Windows with Edge. Anywhere else, ask the user.

## Fallbacks built into `say()` / `narrTick()`

- **A live voice errors** (not `interrupted` or `canceled`) and a recording exists → the recording plays.
- **Waiting for the voice:**
  - if `onstart` never arrives, speech is assumed to have started after 1.8 s;
  - after (estimated length × 2.2 + 3 s) with the voice no longer speaking, the line is treated as finished;
  - at × 4 + 8 s the voice is stopped regardless;
  - for the recording, the limit is 2 × estimated length (at least 3 s) + 10 s.
- **3 failures in a row** → narration turns off and the note says 「配音没有出声，先只放字幕和配乐。」.
- **Tests:** they must stub `speechSynthesis.speak`. Chrome hands Windows (SAPI) voices to Windows itself, which plays them directly, so even a muted headless browser can talk through the user's speakers. An early live test in this project probably did.
