// node mixprobe.js <page.html> <cue> [seconds=20]
// Finds what is loud when levels.js reports a high peak. Muted headless Chrome: stubs speechSynthesis, clicks Play with
// a real mouse event, jumps to <cue> and then LETS THE STORY PLAY ON, printing every 250 ms:
//   cue, phase, music section, section/duck gains, the ambience loop gains (rain/pour/fire, if the page has them) and
//   peak/RMS dB of the music input (AU.mIn), music bus (AU.mMute), effects (AU.sIn), voice (AU.vIn), master (AU.master).
// Then prints the loudest master peak and where it happened.
// Start a cue or two BEFORE the suspect moment: a jump straight to the loud cue once sounded normal; the burst only
// came when the music flowed from one section into the next (notes queued ahead were being faded from gain 1).
// Note: levels.js and this tool read AU.master, which is BEFORE the compressor/limiter, so a peak above 0 dBFS here is
// being squashed by the limiter: audible as a blast or pumping.
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [FILE, CUE, SECS = 20] = process.argv.slice(2);
if (!FILE || CUE == null) { console.log('usage: node mixprobe.js <page.html> <cue> [seconds=20]'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const port = 9600 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-mixprobe-' + port);
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40; i++) { try { list = await getJSON(`http://127.0.0.1:${port}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {};
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? 'THREW ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(path.resolve(FILE)).href }); await sleep(3000);
  await ev(`speechSynthesis.speak = u => {}; 1`);                 // never let a Windows voice talk
  const b = JSON.parse(await ev(`JSON.stringify(document.getElementById('go').getBoundingClientRect())`));
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: b.x + b.width / 2, y: b.y + b.height / 2, button: 'left', clickCount: 1 });
  await sleep(500);
  await ev(`(() => { const mk = n => { const a = AU.ac.createAnalyser(); a.fftSize = 2048; n.connect(a); return a; };
    window.__A = {mIn: mk(AU.mIn), mMute: mk(AU.mMute), sIn: mk(AU.sIn), vIn: mk(AU.vIn), master: mk(AU.master)}; return 1; })()`);
  await ev(`(jumpTo(${CUE}), 1)`);
  let worst = {pk: -200};
  for (let k = 0; k < SECS * 4; k++) {
    await sleep(250);
    const r = JSON.parse(await ev(`(() => { const lv = a => { const d = new Float32Array(2048); a.getFloatTimeDomainData(d); let pk = 0, s = 0; for (const x of d) { pk = Math.max(pk, Math.abs(x)); s += x * x; } return [+(20 * Math.log10(pk + 1e-9)).toFixed(1), +(10 * Math.log10(s / d.length + 1e-12)).toFixed(1)]; };
      const o = {}; for (const k in window.__A) o[k] = lv(window.__A[k]);
      const lg = n => AU[n] ? +AU[n].g.gain.value.toFixed(3) : null;
      return JSON.stringify({cue: RUN.i, ph: RUN.phase, sec: SC.name, mSec: +AU.mSec.gain.value.toFixed(2), duck: +AU.mDuck.gain.value.toFixed(2), live: SC.live.length,
        loops: {rain: lg('rainL'), pour: lg('pourL'), fire: lg('fireL')}, lv: o}); })()`));
    const L = r.lv, f = x => x[0] + '/' + x[1];
    console.log(`${String(r.cue).padStart(2)} ${r.ph.padEnd(5)} ${r.sec.padEnd(9)} mSec ${r.mSec} duck ${r.duck} live ${r.live} | mIn ${f(L.mIn)} music ${f(L.mMute)} sfx ${f(L.sIn)} voice ${f(L.vIn)} master ${f(L.master)}${r.loops.rain != null || r.loops.pour != null ? ' | loops ' + JSON.stringify(r.loops) : ''}`);
    if (L.master[0] > worst.pk) worst = {pk: L.master[0], cue: r.cue, sec: r.sec, t: (k + 1) / 4};
  }
  console.log(`loudest master peak ${worst.pk} dBFS at cue ${worst.cue} (${worst.sec}), ${worst.t} s after the jump`);
  ws.close(); ch.kill(); await sleep(400); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
