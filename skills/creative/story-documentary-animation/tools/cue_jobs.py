# Prints one shot.js job per cue: "at=N:S&freeze|<outDir>/cNN.png", where S is a moment `frac` of the way through the
# spoken line (estimated like the page does with narration off) or 55% through a card.
# usage: python cue_jobs.py <page.html> <outDir> [frac=.7] [first] [last]
#   bash:  mapfile -t JOBS < <(python cue_jobs.py page.html shots) && node shot.js page.html 1280 720 "${JOBS[@]}"
# Output uses "\n" line endings (a "\r" at the end of a job once became part of the file name, shot.js crashed and left
# a headless browser running). Cues must be written one per line, starting with " {card:'…', dur:N" or " {zh:'…'…pre:N".
# Debug-hash timing is the silent estimate, which is shorter than the real voice: a late S can land in the next cue, so
# check the subtitle in each shot (and probe.js for exact state).
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8', newline='\n')
if len(sys.argv) < 3:
    raise SystemExit('usage: python cue_jobs.py <page.html> <outDir> [frac=.7] [first] [last]')
page, out = sys.argv[1], sys.argv[2].rstrip('/\\')
frac = float(sys.argv[3]) if len(sys.argv) > 3 else .7
s = io.open(page, encoding='utf-8').read()
body = s[s.index('const CUES = ['):]
body = body[:body.index('\n];')]
cues = re.findall(r"^ \{(card:'[^']+', dur:([\d.]+)|zh:'([^']+)'.*?pre:([\d.]+))", body, re.M | re.S)
jobs = []
for i, c in enumerate(cues):
    if c[1]:
        t = float(c[1]) * .55
    else:
        zh, pre = c[2], float(c[3])
        n = len(re.findall(r'[一-鿿]', zh)); p = len(re.findall(r'[，。；：！？、—]', zh))
        t = pre + (.4 + n * .27 + p * .22) * frac
    jobs.append('at=%d:%.1f&freeze|%s/c%02d.png' % (i, t, out, i))
a = int(sys.argv[4]) if len(sys.argv) > 4 else 0
b = int(sys.argv[5]) if len(sys.argv) > 5 else len(jobs) - 1
print('\n'.join(jobs[a:b + 1]))
