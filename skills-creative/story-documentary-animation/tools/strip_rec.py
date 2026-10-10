# Writes a copy of a page without its embedded recordings (the whole <script id="rec-data"> block): small enough to
# Read and grep when a later page lifts parts from it (a 1.9 MB page became 256 KB), and it still runs (fullrun passes;
# the voice falls back to live speech). Name it NN-<故事名>-无录音.html.
# usage: python strip_rec.py <page.html> <copy.html>
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if len(sys.argv) != 3:
    raise SystemExit('usage: python strip_rec.py <page.html> <copy.html>')
src, out = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf-8', newline='').read()
blocks = re.findall(r'<script id="rec-data">.*?</script>\r?\n?', s, re.S)
assert len(blocks) == 1, 'expected one rec-data block, found %d' % len(blocks)
s = s.replace(blocks[0], '')
assert 'STORY_REC = {' not in s
io.open(out, 'w', encoding='utf-8', newline='').write(s)
print('removed %d KB of recordings, copy is %d KB' % (len(blocks[0]) // 1024, len(s.encode('utf-8')) // 1024))
