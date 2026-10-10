// node probe.js <page.html> "<debug hash>" "<js expression>"
// Loads the page in muted headless Chrome with the debug hash (e.g. "at=39:6&freeze"), waits 2.2 s, evaluates the
// expression in the page and prints the result as JSON. Use it when a screenshot looks wrong and you need the state
// behind it, e.g.  node probe.js page.html "at=39:6&freeze" "JSON.stringify({cue:RUN.i, stones:P.stones, stonesIn:P.stonesIn})"
// (That one showed the stone labels were fine: the shot had landed in the next cue, where they were fading out.)
// No sound: narration is off in debug mode and the browser is muted. Quote the expression for the shell; inside it use
// single quotes or \" for strings.
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [FILE, HASH, EXPR] = process.argv.slice(2);
if (!FILE || HASH == null || !EXPR) { console.log('usage: node probe.js <page.html> "<debug hash>" "<js expression>"'); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const port = 9700 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-probe-' + port);
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--mute-audio', '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40; i++) { try { list = await getJSON(`http://127.0.0.1:${port}/json/list`); if (list.some(t => t.type === 'page')) break; } catch (e) {} await sleep(250); }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(path.resolve(FILE)).href + '#' + HASH }); await sleep(2200);
  const r = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true, awaitPromise: true });
  console.log(r.exceptionDetails ? 'THREW ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : JSON.stringify(r.result.value));
  if (errors.length) console.log('errors:', errors.slice(0, 5).join(' | '));
  ws.close(); ch.kill(); await sleep(400); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
