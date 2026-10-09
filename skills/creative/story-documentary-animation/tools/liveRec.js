// node liveRec.js <page.html> [seconds=40]
// Real playback test of the recorded narration in headless, muted Chrome:
//   setup    which voice is chosen, first dropdown entry, depth slider disabled?, note, footer, narration lines with no recording
//   preview  real click on 试听 -> a recording buffer plays
//   play     real click on Play, then once a second: cue, phase, recording playing?, lit/total characters, subtitle text
//   pause    at ~12 s, mid-line: pause 2 s (audio context suspended, position kept), then resume
//   levels   voice vs music while speaking, music in gaps, output peak
// speechSynthesis.speak is stubbed, so no Windows voice can talk through the speakers.
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs'); const http = require('http');
const os = require('os'); const { pathToFileURL } = require('url');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!process.argv[2]) { console.log('usage: node liveRec.js <page.html> [seconds=40]'); process.exit(2); }
const fileUrl = pathToFileURL(path.resolve(process.argv[2])).href, SECS = +(process.argv[3] || 40);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
(async () => {
  const port = 9900 + Math.floor(Math.random() * 90), prof = path.join(os.tmpdir(), 'sda-liverec-' + port);
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
  console.log('setup:', await ev(`JSON.stringify({voice: (bestVoice('zh')||{}).name, firstOption: document.getElementById('o-voice').options[0].textContent, depthDisabled: document.getElementById('o-depth').disabled, note: document.getElementById('note').textContent, footer: (document.getElementById('hint-gen') || {}).textContent, noRecording: CUES.filter(c => c.zh && !c.card).filter(c => !recLine(c.zh)).map(c => c.zh)})`));
  const click = async sel => { const r = JSON.parse(await ev(`JSON.stringify(document.querySelector('${sel}').getBoundingClientRect())`));
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x + r.width / 2, y: r.y + r.height / 2, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x + r.width / 2, y: r.y + r.height / 2, button: 'left', clickCount: 1 }); };
  await click('#o-test'); await sleep(1500);
  console.log('preview:', await ev(`JSON.stringify({src: !!NARR.src, dur: NARR.src && NARR.src.buffer && +NARR.src.buffer.duration.toFixed(2), ac: AU.ac && AU.ac.state})`));
  await click('#go');
  await sleep(500);
  await ev(`(() => { const mk = n => { const a = AU.ac.createAnalyser(); a.fftSize = 2048; n.connect(a); return a; };
    const out = AU.ac.createAnalyser(); out.fftSize = 2048; AU.master.connect(out);
    window.__M = {v: mk(AU.vIn), m: mk(AU.mMute), o: out, speak: {v: 0, m: 0, o: 0, n: 0}, gap: {m: 0, o: 0, n: 0}, vmax: -200, omax: -200};
    const rms = a => { const d = new Float32Array(2048); a.getFloatTimeDomainData(d); let s = 0, pk = 0; for (const x of d) { s += x * x; pk = Math.max(pk, Math.abs(x)); } return [s / d.length, pk]; };
    setInterval(() => { const M = window.__M, [v] = rms(M.v), [m] = rms(M.m), [o, opk] = rms(M.o);
      const vdb = 10 * Math.log10(v + 1e-12); M.vmax = Math.max(M.vmax, vdb); M.omax = Math.max(M.omax, 20 * Math.log10(opk + 1e-9));
      if (vdb > -40) { M.speak.v += v; M.speak.m += m; M.speak.o += o; M.speak.n++; }
      else if (RUN.phase !== 'speak') { M.gap.m += m; M.gap.o += o; M.gap.n++; } }, 50); return 1; })()`);
  const t0 = Date.now(); let pausedOnce = false;
  while ((Date.now() - t0) / 1000 < SECS) {
    await sleep(1000);
    const st = await ev(`JSON.stringify({t: ((Date.now() - ${t0}) / 1000).toFixed(0), cue: RUN.i, phase: RUN.phase, rec: NARR.recMode, playing: !!NARR.src, lit: NARR.bound + '/' + (NARR.text || '').length, T: T.toFixed(1), ac: AU.ac.state, spoke: window.__spoke, sub: document.getElementById('zh').textContent.slice(0, 12)})`);
    console.log(st);
    const s = JSON.parse(st);
    if (!pausedOnce && s.rec && s.playing && +s.t >= 12) {                 // pause mid-line for 2 s, then resume
      pausedOnce = true;
      console.log('-- pause:', await ev(`(setPaused(true), JSON.stringify({ac: AU.ac.state, src: !!NARR.src, lit: NARR.bound}))`));
      await sleep(2000);
      console.log('-- after 2 s paused:', await ev(`JSON.stringify({ac: AU.ac.state, src: !!NARR.src, lit: NARR.bound, T: T.toFixed(1)})`));
      console.log('-- resume:', await ev(`(setPaused(false), JSON.stringify({ac: AU.ac.state, src: !!NARR.src}))`));
    }
  }
  console.log('levels:', await ev(`(() => { const M = window.__M, db = x => (10 * Math.log10(x + 1e-12)).toFixed(1);
    return JSON.stringify({speechWindows: M.speak.n, voiceDuringSpeech: db(M.speak.v / M.speak.n), musicDuringSpeech: db(M.speak.m / M.speak.n), outDuringSpeech: db(M.speak.o / M.speak.n),
      gapWindows: M.gap.n, musicInGaps: db(M.gap.m / M.gap.n), outInGaps: db(M.gap.o / M.gap.n), voiceMax43ms: M.vmax.toFixed(1), outPeak: M.omax.toFixed(1)}); })()`));
  console.log('errors:', errors.length ? errors.slice(0, 8).join(' | ') : 'none');
  ws.close(); ch.kill(); await sleep(500); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
