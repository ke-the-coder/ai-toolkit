// node record.js <outDir> <page.html> [more.html ...] [--rate .85] [--pitch .86]
// Records every Chinese narration line of the page(s) with Edge's "Microsoft 云健 Online (Natural)" voice.
// Headless, muted Edge speaks each line through the normal Web Speech API while we observe, via the DevTools protocol,
// the audio (webm-24khz-16bit-mono-opus) and the WordBoundary timings that Edge's own Read Aloud component receives.
// Nothing plays aloud; Edge's service key is never read or reused. Needs Windows + Edge + internet; ~5-7 s per line.
// Narration lines = cue objects that start a line with {zh:'…', en:'…'  (word anchors / labels are not matched).
// Output: <outDir>/NN.webm + <outDir>/manifest.json {voice, rate, pitch, format, lines:[{text, file, bytes, bounds}]}
//   bounds = [[charIndex, charLength, seconds], ...] for word-by-word subtitles.   Then run build_rec.py.
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os');
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = +args[i + 1]; args.splice(i, 2); return v; };
const RATE = opt('--rate', .85), PITCH = opt('--pitch', .86);
const [OUT_ARG, ...FILES] = args;
if (!OUT_ARG || !FILES.length) { console.log('usage: node record.js <outDir> <page.html> [more.html ...] [--rate .85] [--pitch .86]'); process.exit(2); }
const OUT = path.resolve(OUT_ARG); fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));

const texts = [];
for (const f of FILES) { const s = fs.readFileSync(f, 'utf8'), re = /^\s*\{zh:'([^']+)',\s*en:'/gm; let m; while ((m = re.exec(s))) if (!texts.includes(m[1])) texts.push(m[1]); }
console.log(texts.length, 'narration lines; rate', RATE, 'pitch', PITCH);
if (!texts.length) { console.log('no narration lines found (cues must start a line with {zh:\'...\', en:\'...\')'); process.exit(1); }

(async () => {
  const port = 9800 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-record-' + port);
  const ch = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let ver; for (let i = 0; i < 40; i++) { try { ver = await getJSON(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; let sink = null;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; return; }
    if (sink && (m.method === 'Network.webSocketFrameReceived' || m.method === 'Network.webSocketFrameSent')) sink(m.method.endsWith('Sent') ? 'sent' : 'recv', m.params.response);
  };
  const send = (method, params = {}, sessionId) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify(sessionId ? { id: i, method, params, sessionId } : { id: i, method, params })); });
  await sleep(1500);
  const targets = (await send('Target.getTargets')).targetInfos;
  const ext = targets.find(t => t.url.includes('jdiccldimpdaibmpdkjnbmckianbfold'));   // Edge's built-in Read Aloud component
  const page = targets.find(t => t.type === 'page' && t.url === 'about:blank');
  if (!ext || !page) throw new Error('Read Aloud component or page not found');
  const sExt = (await send('Target.attachToTarget', { targetId: ext.targetId, flatten: true })).sessionId;
  await send('Network.enable', {}, sExt);
  const sPage = (await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })).sessionId;
  const evalPage = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sPage); return r.result && r.result.value; };
  console.log('voice:', await evalPage(`new Promise(res => { let n = 0; const go = () => { const v = speechSynthesis.getVoices().find(x => /云健|Yunjian/.test(x.name)); if (v) return res(v.name); if (++n > 60) return res('none'); setTimeout(go, 250); }; go(); })`));

  const manifest = { voice: 'Microsoft 云健 Online (Natural)', rate: RATE, pitch: PITCH, format: 'webm-24khz-16bit-mono-opus', lines: [] };
  for (let k = 0; k < texts.length; k++) {
    const text = texts[k], spoken = text.replace(/[\u2014\u2013]/g, ' ');
    let reqId = null, done = false; const chunks = [], marks = [];
    sink = (dir, r) => {
      if (r.opcode === 1) {
        const [head, ...rest] = r.payloadData.split('\r\n\r\n'), body = rest.join('\r\n\r\n');
        const rid = (head.match(/X-RequestId:(\w+)/) || [])[1];
        if (dir === 'sent' && /Path:ssml/.test(head)) { reqId = rid; return; }
        if (dir !== 'recv' || rid !== reqId) return;
        if (/Path:audio\.metadata/.test(head)) {
          for (const md of JSON.parse(body).Metadata || []) if (md.Type === 'WordBoundary') marks.push({ t: md.Data.Offset / 1e7, d: md.Data.Duration / 1e7, w: md.Data.text.Text });
        } else if (/Path:turn\.end/.test(head)) done = true;
      } else if (dir === 'recv') {
        const buf = Buffer.from(r.payloadData, 'base64'), hl = buf.readUInt16BE(0), head = buf.slice(2, 2 + hl).toString();
        if ((head.match(/X-RequestId:(\w+)/) || [])[1] === reqId && /Path:audio/.test(head)) chunks.push(buf.slice(2 + hl));
      }
    };
    const res = await evalPage(`new Promise(res => { const v = speechSynthesis.getVoices().find(x => /云健|Yunjian/.test(x.name)); const u = new SpeechSynthesisUtterance(${JSON.stringify(spoken)}); u.voice = v; u.lang = v.lang; u.rate = ${RATE}; u.pitch = ${PITCH}; const t0 = performance.now(); u.onend = () => res('ok ' + ((performance.now() - t0) / 1000).toFixed(2)); u.onerror = e => res('error ' + e.error); setTimeout(() => res('timeout'), 60000); speechSynthesis.speak(u); })`);
    for (let i = 0; i < 60 && !done; i++) await sleep(100);
    const audio = Buffer.concat(chunks);
    // word timings -> character positions in the subtitle text
    let pos = 0; const bounds = [];
    for (const mk of marks) { const at = text.indexOf(mk.w, pos); const ci = at >= 0 ? at : pos; bounds.push([ci, mk.w.length, +mk.t.toFixed(3)]); pos = ci + mk.w.length; }
    const file = String(k).padStart(2, '0') + '.webm';
    fs.writeFileSync(path.join(OUT, file), audio);
    manifest.lines.push({ text, file, bytes: audio.length, bounds });
    console.log(String(k).padStart(2), res, (audio.length / 1024).toFixed(1) + ' KB', marks.length + ' words', done ? '' : 'NO turn.end', text.slice(0, 18));
    if (!audio.length || !done) throw new Error('recording failed for line ' + k + ' (' + res + ')');
    await sleep(300);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const total = manifest.lines.reduce((a, l) => a + l.bytes, 0);
  console.log('total audio', (total / 1024).toFixed(0), 'KB ->', OUT);
  ws.close(); ch.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
