# Syntax-checks every inline <script> of a page with `node --check` (the main script and the recordings block).
# usage: python check_syntax.py <page.html> [more.html ...]        exit code 1 if any script fails
import io, os, re, subprocess, sys, tempfile
sys.stdout.reconfigure(encoding='utf-8', errors='replace'); sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def check(path):
    s = io.open(path, encoding='utf-8').read()
    ok = True
    for attrs, code in re.findall(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', s, re.S):
        m = re.search(r'id="([^"]+)"', attrs)
        label = m.group(1) if m else 'main'
        fd, tmp = tempfile.mkstemp(suffix='.js')
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(code)
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True, encoding='utf-8', errors='replace')
        os.remove(tmp)
        if r.returncode == 0:
            print('%s  %-10s OK  (%.0f KB)' % (os.path.basename(path), label, len(code.encode('utf-8')) / 1024))
        else:
            ok = False
            print('%s  %-10s SYNTAX ERROR\n%s' % (os.path.basename(path), label, '\n'.join(r.stderr.strip().splitlines()[:8])))
    return ok

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__ or 'usage: python check_syntax.py <page.html> [more.html ...]')
    results = [check(p) for p in sys.argv[1:]]
    sys.exit(0 if all(results) else 1)
