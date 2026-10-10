# Checks that a page's narration is the source text word for word (the rule every page follows).
# usage: python check_text.py <page.html> <source> [--story N] [--prologue P] [--tail K]
#   <source>     a UTF-8 text file holding the story text (line breaks are ignored), or, with --story N, a story-list
#                page whose records have "t" (title) and "x" (a list of paragraphs) fields: the Nth "t": is story N.
#   --prologue P narration cues at the start that aren't in the source (default 1: the approved prologue line).
#   --tail K     approved spoken lines after the story (default 0), e.g. a safety reminder. Printed, not compared.
# Takes every narration cue of the page (lines that start with {zh:'…', en:'…'), drops the prologue and tail cues, and
# compares the rest, joined, with the source joined after turning ASCII , : ? ! ; into full-width. Also flags straight
# apostrophes in English lines (cue strings are single-quoted, so English must use ’).
# Prints OK, or the first difference with some context. Exit code 1 on a mismatch.
import argparse, io, json, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ap = argparse.ArgumentParser(description='narration vs source, word for word')
ap.add_argument('page'); ap.add_argument('source')
ap.add_argument('--story', type=int); ap.add_argument('--prologue', type=int, default=1); ap.add_argument('--tail', type=int, default=0)
a = ap.parse_args()
page = io.open(a.page, encoding='utf-8').read()
src = io.open(a.source, encoding='utf-8').read()
zh = re.findall(r"^\s*\{zh:'([^']+)',\s*en:'", page, re.M)
if a.story:
    starts = [m.start() for m in re.finditer(r'"t":', src)]
    if not 1 <= a.story <= len(starts):
        raise SystemExit('story %d not found (the list has %d)' % (a.story, len(starts)))
    rec = src[starts[a.story - 1]:starts[a.story] if a.story < len(starts) else len(src)]
    title = re.search(r'"t":\s*"([^"]*)"', rec).group(1)
    paras = json.loads('[' + re.search(r'"x":\s*\[(.*?)\]', rec, re.S).group(1) + ']')
else:
    title = a.source.replace('\\', '/').split('/')[-1]
    paras = [line.strip() for line in src.splitlines()]
conv = lambda t: t.replace(',', '，').replace(':', '：').replace('?', '？').replace('!', '！').replace(';', '；')
want = ''.join(conv(p) for p in paras)
story = zh[a.prologue:len(zh) - a.tail]
got = ''.join(story)
print('%s: %d narration lines (%d prologue, %d compared, %d after the story)' % (title, len(zh), a.prologue, len(story), a.tail))
for t in zh[:a.prologue]:
    print('prologue (not compared): %s' % t)
for t in zh[len(zh) - a.tail:] if a.tail else []:
    print('approved line after the story (not compared): %s' % t)
ok = want == got
if ok:
    print('OK: the compared lines are the source text word for word')
else:
    i = next((i for i in range(min(len(want), len(got))) if want[i] != got[i]), min(len(want), len(got)))
    print('MISMATCH at character %d\n  page:   …%s…\n  source: …%s…' % (i, got[max(0, i - 12):i + 12], want[max(0, i - 12):i + 12]))
bad = [e for e in re.findall(r"^\s*\{zh:'[^']+',\s*en:'((?:[^'\\]|\\.)*)'", page, re.M) if "\\'" in e]
if bad:
    ok = False; print('English lines with an escaped straight apostrophe (use ’):', bad[:5])
sys.exit(0 if ok else 1)
