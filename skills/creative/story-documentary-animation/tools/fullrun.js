// node fullrun.js <page.html> [start.png]
// Fast-forwards the whole story in headless Chrome (narration off, drawing every 3rd frame) and reports exceptions,
// how many cues were visited, the story length and whether it reached the end. Then loads the page fresh and saves a
// screenshot of the start screen (default ./start.png) so the start screen can be checked too.
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!process.argv[2]) { console.log('usage: node fullrun.js <page.html> [start.png]'); process.exit(2); }
const fileUrl = pathToFileURL(path.resolve(process.argv[2])).href, SHOT = path.resolve(process.argv[3] || 'start.png');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const port = 9600 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-fullrun-' + port);
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--mute-audio', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40; i++) { try { list = await getJSON(`http://127.0.0.1:${port}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) errors.push(m.params.args.map(a => a.value ?? a.description).join(' ')); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true, timeout: 300000 }); return r.exceptionDetails ? 'THREW ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: fileUrl + '#at=0' }); await sleep(2500);
  // fastStep() = step + character update + palette (template); older pages (the example) fall back to the same calls
  console.log('run:', await ev(`(() => { const t0 = performance.now(), seen = new Set(); let k = 0, thrown = null;
    const adv = typeof fastStep === 'function' ? fastStep : dt => { step(dt); panguUpdate(); };
    try { for (; k < 30 * 60 * 10 && RUN.phase !== 'done'; k++) { adv(1 / 30); if (k % 3 === 0) render(); seen.add(RUN.i); } }
    catch (e) { thrown = e.stack.split('\\n').slice(0, 3).join(' / '); }
    return JSON.stringify({phase: RUN.phase, cuesVisited: seen.size, cues: CUES.length, storySeconds: +(k / 30).toFixed(0), thrown, ms: +(performance.now() - t0).toFixed(0)}); })()`));
  await send('Page.navigate', { url: fileUrl }); await sleep(3000);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
  console.log('start screen:', SHOT);
  console.log('errors:', errors.length ? errors.slice(0, 8).join(' | ') : 'none');
  ws.close(); ch.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
