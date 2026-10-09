# Embeds the recorded narration (<recDir>/*.webm + word timings from manifest.json, made by record.js) into each page as
#   <script id="rec-data">window.STORY_REC = {voice, rate, pitch, format, lines:{"<exact zh text>": {a: base64, b: bounds}}}</script>
# placed just before the main script. Replaces an existing block, embeds only the lines the page uses, and stops if any
# narration line of the page has no recording (re-run record.js after changing the text).
# usage: python build_rec.py <recDir> <page.html> [more.html ...]
import io, json, base64, os, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace'); sys.stderr.reconfigure(encoding='utf-8', errors='replace')

if len(sys.argv) < 3:
    raise SystemExit('usage: python build_rec.py <recDir> <page.html> [more.html ...]')
rec_dir = sys.argv[1]
man = json.load(io.open(os.path.join(rec_dir, 'manifest.json'), encoding='utf-8'))
recs = {l['text']: l for l in man['lines']}
NARR_RE = re.compile(r"^\s*\{zh:'([^']+)',\s*en:'", re.M)      # same rule as record.js: a cue that starts a line
ANCHOR = "<script>\n'use strict';"

for path in sys.argv[2:]:
    s = io.open(path, encoding='utf-8').read()
    if 'window.STORY_REC' not in s:
        raise SystemExit('%s: the page does not read window.STORY_REC (copy the engine from template/story-engine.html)' % path)
    texts = list(dict.fromkeys(NARR_RE.findall(s)))
    missing = [t for t in texts if t not in recs]
    if missing:
        raise SystemExit('%s: no recording for %d line(s):\n  %s' % (path, len(missing), '\n  '.join(missing)))
    lines = {}
    for t in texts:
        data = open(os.path.join(rec_dir, recs[t]['file']), 'rb').read()
        lines[t] = {'a': base64.b64encode(data).decode('ascii'), 'b': recs[t]['bounds']}
    payload = {'voice': '云健', 'rate': man['rate'], 'pitch': man['pitch'], 'format': 'audio/webm;codecs=opus', 'lines': lines}
    js = 'window.STORY_REC = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';'
    block = '<script id="rec-data">/* 事先用 Edge 的“云健”录好的旁白 (Opus) 和逐字时间 */\n' + js + '\n</script>\n'
    s = re.sub(r'<script id="rec-data">.*?</script>\n', '', s, flags=re.S)
    if s.count(ANCHOR) != 1:
        raise SystemExit('%s: expected exactly one main script starting with %r' % (path, ANCHOR))
    s = s.replace(ANCHOR, block + ANCHOR)
    io.open(path, 'w', encoding='utf-8').write(s)
    unused = len([t for t in recs if t not in lines])
    print('%s: %d narration lines embedded (%.0f KB base64), page is now %.1f MB%s' % (
        os.path.basename(path), len(lines), len(js) / 1024, len(s.encode('utf-8')) / 1e6,
        '; %d recordings in the manifest not used by this page' % unused if unused else ''))
