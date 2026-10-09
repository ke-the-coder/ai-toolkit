// node shot.js <page.html> <W> <H> "<hash>|<out.png>[|waitMs]" ...
// Loads the page in headless Chrome once per job with the debug hash, waits (default 1800 ms), saves a screenshot and
// prints any console errors. Debug hash (narration is switched off):  at=CUE[:SEC][&freeze][&force=POSE]
//   at=12:3.5&freeze      jump to cue 12, fast-forward 3.5 s, freeze     |  (empty hash) = the start screen
//   at=12:0&freeze&force=angry   same cue, but force a pose (pose gallery)
// Examples:  node shot.js page.html 1280 720 "at=4:3&freeze|v4.png" "at=45:9&freeze|end.png|2600" "|start.png"
//            node shot.js page.html 390 844 "at=6:5&freeze|m1.png"          (phone portrait)
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [FILE, W, H, ...jobs] = process.argv.slice(2);
if (!FILE || !+W || !+H || !jobs.length) { console.log('usage: node shot.js <page.html> <W> <H> "<hash>|<out.png>[|waitMs]" ...'); process.exit(2); }
const fileUrl = pathToFileURL(path.resolve(FILE)).href, PORT = 9333 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const prof = path.join(os.tmpdir(), 'sda-shot-' + PORT);
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`,
    '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 60; i++) { try { list = await getJSON(`http://127.0.0.1:${PORT}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, msgs = [];
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') msgs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    else if (m.method === 'Runtime.consoleAPICalled' && /error|warning/.test(m.params.type)) msgs.push(m.params.type + ' ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') msgs.push('LOG ' + m.params.entry.text);
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  let k = 0;
  for (const job of jobs) {
    const [hash, out, wait] = job.split('|');
    msgs.length = 0;
    await send('Page.navigate', { url: fileUrl + '?r=' + (k++) + '#' + hash });
    await sleep(+(wait || 1800));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.resolve(out), Buffer.from(shot.data, 'base64'));
    console.log(out, msgs.length ? '\n  ' + msgs.slice(0, 8).join('\n  ') : 'ok');
  }
  ws.close(); ch.kill();
  await sleep(300);
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
