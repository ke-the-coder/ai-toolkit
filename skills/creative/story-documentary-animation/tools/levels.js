// node levels.js <page.html> [secondsPerSection=9] [minMarginDb=9]
// Mix check in headless, muted Chrome. Clicks Play (real mouse event), lets the first section play as it starts, then
// jumps to every later cue that starts a music section and, for `secondsPerSection` seconds each, measures the recorded-narration bus (AU.vIn) and the music bus after
// ducking (AU.mMute) while the voice speaks, the music in the gaps, and the output peak.
// PASS = the voice is at least `minMarginDb` above the music in every section that had speech. The approved example
// measures 9.3-14.8 dB (quietest: the soft line in 'sad'); before auto-ducking, loud scenes had only 2-6 dB.
// Needs the recordings embedded: live browser voices don't pass through Web Audio, so they can't be measured
// (speechSynthesis.speak is stubbed, so no Windows voice can talk through the speakers).
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!process.argv[2]) { console.log('usage: node levels.js <page.html> [secondsPerSection=9] [minMarginDb=9]'); process.exit(2); }
const fileUrl = pathToFileURL(path.resolve(process.argv[2])).href, SEG = +(process.argv[3] || 9), MIN = +(process.argv[4] || 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const port = 9900 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-levels-' + port);
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40; i++) { try { list = await getJSON(`http://127.0.0.1:${port}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) errors.push(m.params.args.map(a => a.value ?? a.description).join(' ')); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? 'THREW ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: fileUrl }); await sleep(3000);
  await ev(`window.__spoke = 0; speechSynthesis.speak = u => { window.__spoke++; }; 1`);   // never let a Windows voice talk
  console.log('voice:', await ev(`(bestVoice('zh') || {}).name`));
  const b = JSON.parse(await ev(`JSON.stringify(document.getElementById('go').getBoundingClientRect())`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x + b.width / 2, y: b.y + b.height / 2, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x + b.width / 2, y: b.y + b.height / 2, button: 'left', clickCount: 1 });
  // Attach the meters as soon as Play has built the audio graph, so the opening hit is measured once, as heard.
  for (let k = 0; k < 100 && !(await ev(`!!(window.AU && AU.ac && AU.master && AU.vIn && AU.mMute)`)); k++) await sleep(30);
  await ev(`(() => { const mk = n => { const a = AU.ac.createAnalyser(); a.fftSize = 2048; n.connect(a); return a; };
    const out = AU.ac.createAnalyser(); out.fftSize = 2048; AU.master.connect(out);
    window.__M = {v: mk(AU.vIn), m: mk(AU.mMute), o: out, speak: {v: 0, m: 0, o: 0, n: 0}, gap: {m: 0, o: 0, n: 0}, vmax: -200, omax: -200};
    const rms = a => { const d = new Float32Array(2048); a.getFloatTimeDomainData(d); let s = 0, pk = 0; for (const x of d) { s += x * x; pk = Math.max(pk, Math.abs(x)); } return [s / d.length, pk]; };
    setInterval(() => { const M = window.__M, [v] = rms(M.v), [m] = rms(M.m), [o, opk] = rms(M.o);
      const vdb = 10 * Math.log10(v + 1e-12); M.vmax = Math.max(M.vmax, vdb); M.omax = Math.max(M.omax, 20 * Math.log10(opk + 1e-9));
      if (vdb > -40) { M.speak.v += v; M.speak.m += m; M.speak.o += o; M.speak.n++; }
      else if (RUN.phase !== 'speak') { M.gap.m += m; M.gap.o += o; M.gap.n++; } }, 50); return 1; })()`);
  const sections = JSON.parse(await ev(`JSON.stringify(CUES.map((c, i) => [i, c.mood || '']).filter(x => x[1]))`));
  const fails = []; let peak = -200, first = true;
  for (const [i, mood] of sections) {
    // Play has already started the first section; jumping to it again would play its opening hit twice, on top of
    // itself, and report a peak nobody hears (once +0.2 dBFS that way, against about -4.7 when it just plays).
    const already = first && +(await ev(`RUN.i`)) === i; first = false;
    if (!already) await ev(`(jumpTo(${i}), Object.assign(window.__M, {speak: {v: 0, m: 0, o: 0, n: 0}, gap: {m: 0, o: 0, n: 0}, vmax: -200, omax: -200}), 1)`);
    await sleep(SEG * 1000);
    const r = JSON.parse(await ev(`(() => { const M = window.__M, db = x => +(10 * Math.log10(x + 1e-12)).toFixed(1);
      return JSON.stringify({n: M.speak.n, v: db(M.speak.v / M.speak.n), m: db(M.speak.m / M.speak.n), gap: db(M.gap.m / M.gap.n), out: db(M.speak.o / M.speak.n), peak: +M.omax.toFixed(1), now: RUN.i}); })()`));
    peak = Math.max(peak, r.peak);
    const margin = r.n ? +(r.v - r.m).toFixed(1) : null;
    if (margin !== null && margin < MIN) fails.push(`${mood}@${i} (${margin} dB)`);
    console.log(String(i).padStart(2), mood.padEnd(10), r.n ? `voice ${r.v}  music ${r.m}  margin ${margin} dB` : 'no speech in window', ` | gap music ${r.gap}  peak ${r.peak}  cue now ${r.now}`);
  }
  console.log(`output peak ${peak.toFixed(1)} dBFS`);
  console.log(fails.length ? `FAIL: voice less than ${MIN} dB above the music in ${fails.join(', ')}` : `PASS: voice at least ${MIN} dB above the music in every section with speech`);
  console.log('errors:', errors.length ? errors.slice(0, 8).join(' | ') : 'none');
  ws.close(); ch.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
