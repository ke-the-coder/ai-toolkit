# Rebuilds a story page from the template plus section files, every time from scratch, so a section can be edited and
# the page rebuilt without any leftover state from earlier splices (one story was built this way: about 40 rebuilds).
# usage: python build_page.py <spec.json>
# spec (paths relative to the spec file unless absolute):
#   {"template": ".../template/story-engine.html",
#    "page": "NN-<故事名>-动画.html",
#    "text": [["old", "new"], ...],                 # exact replacements in the head, start/end screens, storage prefix
#                                                    #   (each old string must occur exactly once)
#    "sections": [["<start marker>", "<end marker>", ["a.js", "b.js"]], ...],
#                                                    # everything from the start marker (kept in the new text) up to the
#                                                    #   end marker is replaced by the files, concatenated in order
#    "after": [["old", "new"], ...],                 # exact replacements applied last (e.g. drop initParticles())
#    "rec": "rec"}                                   # optional: once <rec>/manifest.json exists, build_rec.py re-embeds
#                                                    #   the recordings after every rebuild
# Then check_syntax.py runs on the result. Section files start with their own section comment, e.g.
#   /* ================= 分镜脚本 ================= */, so the markers stay findable in the built page.
import io, json, os, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if len(sys.argv) != 2:
    raise SystemExit('usage: python build_page.py <spec.json>')
spec_path = os.path.abspath(sys.argv[1]); base = os.path.dirname(spec_path)
spec = json.load(io.open(spec_path, encoding='utf-8'))
here = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
rd = lambda p: io.open(here(p), encoding='utf-8').read()
s = rd(spec['template'])
def rep(pairs, what):
    global s
    for a, b in pairs:
        n = s.count(a)
        if n != 1: raise SystemExit('%s: expected exactly one %r, found %d' % (what, a[:70], n))
        s = s.replace(a, b)
rep(spec.get('text', []), 'text')
for a, b, files in spec.get('sections', []):
    i = s.find(a)
    if i < 0 or s.find(a, i + 1) >= 0: raise SystemExit('start marker not found exactly once: %r' % a)
    j = s.find(b, i + len(a))
    if j < 0: raise SystemExit('end marker not found after the start marker: %r' % b)
    new = ''.join(rd(f) for f in files)
    if not new.endswith('\n'): new += '\n'
    s = s[:i] + new + s[j:]
rep(spec.get('after', []), 'after')
page = here(spec['page'])
io.open(page, 'w', encoding='utf-8', newline='\n').write(s)
print('built %s: %d KB, %d lines' % (os.path.basename(page), len(s.encode('utf-8')) // 1024, s.count('\n')))
tools = os.path.dirname(os.path.abspath(__file__))
rec = spec.get('rec')
if rec and os.path.exists(os.path.join(here(rec), 'manifest.json')):
    r = subprocess.run([sys.executable, os.path.join(tools, 'build_rec.py'), here(rec), page], capture_output=True, text=True, encoding='utf-8')
    print((r.stdout + r.stderr).strip())
    if r.returncode: sys.exit(r.returncode)
r = subprocess.run([sys.executable, os.path.join(tools, 'check_syntax.py'), page], capture_output=True, text=True, encoding='utf-8')
print((r.stdout + r.stderr).strip())
sys.exit(r.returncode)
