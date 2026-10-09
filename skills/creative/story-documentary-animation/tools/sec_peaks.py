# Summarises a mixprobe.js log by music section: for each section change, the loudest music input (mIn) and master
# peak in the first 3 s after it, and the loudest master peak in the whole section. Give two logs to compare a page
# before and after an audio fix, played the same way (for example `node mixprobe.js page.html 0 330 > before.txt`).
# usage: python sec_peaks.py before.txt [after.txt]
# Reading it: a section-change fix should make the "first 3 s" columns equal or quieter. If a whole-section peak gets
# louder, find that row in the log and check which bus did it: with the music bus unchanged and effects + voice loud,
# it's where the 250 ms sample fell on a hit, not a regression (one case: -4.1 before, -1.1 after, music -28.7 in both).
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if not 2 <= len(sys.argv) <= 3:
    raise SystemExit('usage: python sec_peaks.py before.txt [after.txt]')
ROW = re.compile(r'\s*(\d+) (\w+)\s+(\w+)\s+mSec .*?mIn (-?[\d.]+)/.*?master (-?[\d.]+)/')
def parse(f):
    rows = [(int(m.group(1)), m.group(3), float(m.group(4)), float(m.group(5)))
            for m in map(ROW.match, io.open(f, encoding='utf-8', errors='replace')) if m]
    out, i = [], 0
    while i < len(rows):
        j = i
        while j < len(rows) and rows[j][1] == rows[i][1]: j += 1
        win = rows[i:i + 12]                                   # 12 samples x 250 ms = 3 s
        out.append((rows[i][0], rows[i][1], max(r[2] for r in win), max(r[3] for r in win), max(r[3] for r in rows[i:j])))
        i = j
    return out
runs = [parse(f) for f in sys.argv[1:]]
print('cue section     first 3 s: mIn / master   section master' + ('  | after: first 3 s mIn / master, section master' if len(runs) > 1 else ''))
for k, a in enumerate(runs[0]):
    line = '%3d %-10s  %8.1f / %6.1f        %6.1f' % a
    if len(runs) > 1 and k < len(runs[1]):
        b = runs[1][k]
        line += '  | %-10s %6.1f / %6.1f   %6.1f' % (b[1], b[2], b[3], b[4])
    print(line)
for f, r in zip(sys.argv[1:], runs):
    if r: print('%s: %d sections, loudest master %.1f dBFS' % (f.replace('\\', '/').split('/')[-1], len(r), max(x[4] for x in r)))
    else: print('%s: no mixprobe rows found' % f)
