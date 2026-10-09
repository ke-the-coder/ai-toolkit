# Replaces one whole section of a page with the contents of a file, found by two markers, so a big section (the cues,
# all the scene code, the timeline) can be written with the Write tool and swapped in without one huge Edit.
# usage: python splice.py <page.html> "<start marker>" "<end marker>" <new.js>
#   Everything from the start marker (included) up to the end marker (excluded) is replaced. The start marker must occur
#   exactly once. Typical markers are the section comments, e.g.
#   python splice.py page.html "/* ================= 分镜脚本 =================" "/* ================= 配乐：" cues.js
# Run check_syntax.py afterwards.
import io, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if len(sys.argv) != 5:
    raise SystemExit('usage: python splice.py <page.html> "<start marker>" "<end marker>" <new.js>')
page, a, b, src = sys.argv[1:5]
s = io.open(page, encoding='utf-8').read()
i = s.find(a)
if i < 0 or s.find(a, i + 1) >= 0:
    raise SystemExit('start marker not found exactly once: %r' % a)
j = s.find(b, i + len(a))
if j < 0:
    raise SystemExit('end marker not found after the start marker: %r' % b)
new = io.open(src, encoding='utf-8').read()
if not new.endswith('\n'):
    new += '\n'
old_lines = s[i:j].count('\n')
s = s[:i] + new + s[j:]
io.open(page, 'w', encoding='utf-8', newline='\n').write(s)
print('replaced %d lines with %d lines' % (old_lines, new.count('\n')))
