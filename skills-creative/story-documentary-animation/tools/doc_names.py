# Checks that the names a doc quotes in backticks exist in a page, so engine-map.md's catalogues don't point at code
# that isn't there. Identifiers are matched as whole words; backticked text with Chinese (section comments) as a
# substring, ignoring a trailing "…". Use it after writing a parts catalogue for a page, especially one written from
# a subagent's report: names that are descriptions, not code, show up as missing and are worth rewording.
# usage: python doc_names.py <doc.md> <page.html> ["## heading to start from"]
#   With a heading, only that part of the doc (up to the next "## ") is checked.
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if not 3 <= len(sys.argv) <= 4:
    raise SystemExit('usage: python doc_names.py <doc.md> <page.html> ["## heading"]')
doc = io.open(sys.argv[1], encoding='utf-8').read()
page = io.open(sys.argv[2], encoding='utf-8').read()
page = re.sub(r'<script id="rec-data">.*?</script>', '', page, flags=re.S)
if len(sys.argv) == 4:
    i = doc.find(sys.argv[3])
    if i < 0: raise SystemExit('heading not found: ' + sys.argv[3])
    j = doc.find('\n## ', i + len(sys.argv[3]))
    doc = doc[i:j if j > 0 else len(doc)]
CJK = re.compile(r'[一-鿿]')
ids, secs = set(), set()
for t in re.findall(r'`([^`\n]+)`', doc):
    if '/' in t or re.search(r'\.(html|md|py|js)$', t):
        continue                                             # a file path, not code
    call = re.match(r'\s*([A-Za-z_]\w*)\(', t)
    if call:
        ids.add(call.group(1)); continue                     # a signature: check the function, not its parameters
    if CJK.search(t):
        secs.add(t.rstrip('…').strip())
    ids.update(re.findall(r'(?<![\w.])([A-Za-z_][A-Za-z0-9_]{2,})', t))
for row in re.findall(r'^\|([^|\n]+)\|', doc, re.M):          # a table's first column names sections, e.g. | 远近 |
    cell = row.strip()
    if '`' in cell or cell.startswith('(') or not CJK.search(cell):
        continue
    secs.update(p.strip().rstrip('…') for p in cell.split(' · ') if CJK.search(p))
miss_s = sorted(t for t in secs if t not in page)
miss_i = sorted(n for n in ids if not re.search(r'\b' + re.escape(n) + r'\b', page))
print('%d section names, %d identifiers checked' % (len(secs), len(ids)))
print('missing section names:', miss_s or 'none')
print('missing identifiers:', miss_i or 'none')
sys.exit(1 if miss_s or miss_i else 0)
