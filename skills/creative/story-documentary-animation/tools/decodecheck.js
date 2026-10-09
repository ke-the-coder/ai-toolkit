// node decodecheck.js <recDir>
// Decodes every recorded line from <recDir>/manifest.json in headless Chrome (decodeAudioData, the same call the page
// uses) and prints duration, peak and RMS per line, plus totals. Any "DECODE FAILED" line must be re-recorded.
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!process.argv[2]) { console.log('usage: node decodecheck.js <recDir>'); process.exit(2); }
const DIR = path.resolve(process.argv[2]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
(async () => {
  const port = 9891 + Math.floor(Math.random() * 60), prof = path.join(os.tmpdir(), 'sda-decode-' + port);
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40; i++) { try { list = await getJSON(`http://127.0.0.1:${port}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  let total = 0, bytes = 0, bad = 0;
  for (const l of man.lines) {
    const b64 = fs.readFileSync(path.join(DIR, l.file)).toString('base64'); bytes += l.bytes;
    const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression:
      `(async () => { const ac = new OfflineAudioContext(1, 48000, 48000); const bin = atob('${b64}'); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        try { const buf = await ac.decodeAudioData(u.buffer); const d = buf.getChannelData(0); let pk = 0, s = 0; for (const v of d) { pk = Math.max(pk, Math.abs(v)); s += v * v; } return buf.duration.toFixed(2) + 's peak ' + (20 * Math.log10(pk)).toFixed(1) + ' dB rms ' + (10 * Math.log10(s / d.length)).toFixed(1) + ' dB'; } catch (e) { return 'DECODE FAILED ' + e.message; } })()` });
    const v = r.result.value; if (/FAILED/.test(v)) bad++; else total += parseFloat(v);
    const lastB = l.bounds[l.bounds.length - 1];
    console.log(v.padEnd(38), ('last word @' + (lastB ? lastB[2] : '-') + 's').padEnd(18), l.text.slice(0, 16));
  }
  console.log(`\n${man.lines.length} lines, ${(bytes / 1024).toFixed(0)} KB, ${total.toFixed(1)} s of speech, ${bad} failed`);
  ws.close(); ch.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
