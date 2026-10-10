// node edgeRec.js <page.html> [edge|chrome]
// A: which voices the page picks in that browser (male default, what 女声 would pick, first dropdown entries, note).
// B: live speech fails (every speak() is answered with a simulated 'network' error) -> the recorded line must take over
//    and the story must keep going. speechSynthesis.speak never really speaks here, so nothing can reach the speakers.
// Headless Edge treats the page as hidden: no animation frames, and timers are slowed to about one tick a second.
// Visibility is faked before load (so the page doesn't pause itself), and once the story clock stops, the timeline is
// advanced by the real time that has passed (a fixed 1/30 s per tick would crawl at ~1/30 of real speed).
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
if (!process.argv[2]) { console.log('usage: node edgeRec.js <page.html> [edge|chrome]'); process.exit(2); }
const BR = process.argv[3] || 'edge';
const EXE = BR === 'edge' ? (process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe') : (process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const fileUrl = pathToFileURL(path.resolve(process.argv[2])).href;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DRIVE = `(() => { let last = performance.now(); setInterval(() => { const now = performance.now(); let dt = Math.min(2, (now - last) / 1000); last = now;
  if (paused) return; while (dt > 1e-4) { const d = Math.min(dt, 1 / 30); step(d); dt -= d; } }, 33); return 1; })()`;
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const port = 9700 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-edgerec-' + port);
  const ch = spawn(EXE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40; i++) { try { list = await getJSON(`http://127.0.0.1:${port}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) errors.push(m.params.args.map(a => a.value ?? a.description).join(' ')); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? 'THREW ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    Object.defineProperty(document, 'hidden', {get: () => false}); Object.defineProperty(document, 'visibilityState', {get: () => 'visible'});
    window.__spoke = []; speechSynthesis.speak = u => { window.__spoke.push((u.voice && u.voice.name) + ': ' + u.text.slice(0, 10));
      if (u.text.trim()) setTimeout(() => u.onerror && u.onerror({error: 'network'}), 60); };` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: fileUrl }); await sleep(3500);
  /* Chrome's Google voices and Edge's online voices arrive over the network, sometimes after the page's own reloads
     (700 ms, 2.2 s). A fixed wait once listed no Google voice at all, so 女声 fell to Huihui. Wait until the list has
     stopped changing for 2 s (at most 12 s more), then let the page rebuild its dropdown. */
  { let last = -1, same = 0; for (let i = 0; i < 48 && same < 8; i++) { const n = +(await ev(`speechSynthesis.getVoices().length`)); same = n === last && n > 0 ? same + 1 : 0; last = n; await sleep(250); }
    await ev(`typeof loadVoices === 'function' && loadVoices(), 1`); await sleep(300);
    console.log('A voices in the browser:', last); }
  console.log('A male default:', await ev(`JSON.stringify({pick: (bestVoice('zh')||{}).name, gen: NARR.gen, options: [...document.getElementById('o-voice').options].map(o => o.textContent).slice(0, 5), depthOff: document.getElementById('o-depth').disabled, note: document.getElementById('note').textContent})`));
  console.log('A female choice:', await ev(`(() => { const g = NARR.gen, a = NARR.genAuto; NARR.gen = 'f'; NARR.genAuto = false; const v = (bestVoice('zh')||{}).name; NARR.gen = g; NARR.genAuto = a; return v; })()`));
  console.log('A Cantonese voices listed:', await ev(`JSON.stringify([...document.getElementById('o-voice').options].map(o => o.textContent).filter(t => /zh-HK|zh-MO|yue|粤|粵/i.test(t)))`));
  const b = JSON.parse(await ev(`JSON.stringify(document.getElementById('go').getBoundingClientRect())`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x + b.width / 2, y: b.y + b.height / 2, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x + b.width / 2, y: b.y + b.height / 2, button: 'left', clickCount: 1 });
  await sleep(1200);
  const T1 = +(await ev(`T`)); await sleep(500); const T2 = +(await ev(`T`));
  let driven = false;
  if (T2 - T1 < .2) { driven = true; console.log('(no animation frames: driving the timeline by elapsed time)'); await ev(DRIVE); }
  let lastT = -1;
  for (let k = 0; k < 25; k++) {
    await sleep(1000);
    const Tn = +(await ev(`T`));
    if (Tn === lastT && !driven) { driven = true; console.log('(animation frames stopped: driving the timeline by elapsed time)', await ev(`JSON.stringify({paused, playing, hidden: document.hidden})`)); await ev(DRIVE); }
    lastT = Tn;
    console.log('B', await ev(`JSON.stringify({cue: RUN.i, phase: RUN.phase, rec: NARR.recMode, src: !!NARR.src, lit: NARR.bound + '/' + (NARR.text || '').length, T: T.toFixed(1), ac: AU.ac && AU.ac.state, spoke: window.__spoke.length})`));
  }
  console.log('speak calls:', await ev(`JSON.stringify(window.__spoke.slice(0, 5))`));
  console.log('errors:', errors.length ? errors.slice(0, 8).join(' | ') : 'none');
  ws.close(); ch.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
