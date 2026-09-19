// One paid request; synthetic audio only. Run explicitly after starting the local gateway.
import { _electron as electron } from '@playwright/test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const dryRun = process.argv.includes('--dry-run');
if (!dryRun && !process.argv.includes('--live')) throw Error('Pass --live to authorize one Gemini request, or --dry-run for audio checks without an API call.');
const temp = await mkdtemp(path.join(os.tmpdir(), 'barcodemate-voice-'));
const app = await electron.launch({
  args: ['--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=/private/tmp/barcodemate-home-voice-zh.wav', '.'],
  env: {...process.env, BARCODEMATE_TEST_DIR: temp, BARCODEMATE_HOME_API: 'http://127.0.0.1:8107'},
});
try {
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  // Electron's file-backed fake microphone yielded zero samples on this Mac.
  // Probe its permission path with the fake device, then feed a known WAV through
  // Web Audio into the real MediaRecorder. No physical microphone is accessed.
  await page.evaluate(wav => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const probe = await original(constraints);
      probe.getTracks().forEach(track => track.stop());
      const context = new AudioContext();
      await context.resume();
      const bytes = Uint8Array.from(atob(wav), c => c.charCodeAt(0));
      const buffer = await context.decodeAudioData(bytes.buffer);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      source.start();
      source.onended = () => context.close();
      return destination.stream;
    };
  }, (await readFile('/private/tmp/barcodemate-home-voice-zh.wav')).toString('base64'));
  await app.evaluate(({app}, dryRun) => {
    if (app.commandLine.getSwitchValue('use-file-for-fake-audio-capture') !== '/private/tmp/barcodemate-home-voice-zh.wav') throw Error('Synthetic audio flag was not applied');
    const original = globalThis.fetch;
    globalThis.voiceChecks = [];
    globalThis.fetch = async (...args) => {
      if (String(args[0]).endsWith('/voice') && dryRun) {
        const input = JSON.parse(args[1].body);
        const wav = Buffer.from(input.audio,'base64');
        let sum=0, nonzero=0;
        for(let i=44;i<wav.length;i+=2){const n=wav.readInt16LE(i);sum+=n*n;if(n)nonzero++;}
        globalThis.voiceChecks.push({audioBytes:wav.length,rms:Math.sqrt(sum/((wav.length-44)/2)),nonzero});
        return new Response(JSON.stringify({language:'zh-Hans',bilingual:true,items:[{name:'盐',second:'Salt',quantity:2},{name:'糖',second:'Sugar',quantity:3},{name:'面粉',second:'Flour',quantity:1}]}),{headers:{'Content-Type':'application/json'}});
      }
      const response = await original(...args);
      if (String(args[0]).endsWith('/voice')) {
        const input = JSON.parse(args[1].body);
        globalThis.voiceChecks.push({status:response.status, result:await response.clone().json(), mime:input.mime, seconds:input.seconds, audioBytes:Buffer.from(input.audio,'base64').length});
      }
      return response;
    };
  }, dryRun);
  assert.equal((await page.evaluate(() => window.desktop.homeCapabilities())).voice, true);
  await page.locator('#language-select').selectOption('zh-Hans');
  await page.locator('[data-workspace=scenarios]').click();
  await page.locator('[data-workspace=home]').click();
  await page.getByRole('button', {name:'说出物品', exact:true}).click();
  await page.getByRole('button', {name:'停止', exact:true}).waitFor({timeout:10000});
  await page.waitForTimeout(7300);
  const started = Date.now();
  await page.getByRole('button', {name:'停止', exact:true}).click();
  try {
    await page.waitForFunction(() => document.querySelectorAll('.hm-chip-selected').length === 3, null, {timeout:45000});
  } catch (error) {
    const diagnostic = {status:await page.locator('.hm-status').innerText(), project:await page.evaluate(() => JSON.parse(localStorage.getItem('barcodemate.home.v1'))), gateway:await app.evaluate(() => globalThis.voiceChecks), errors};
    await writeFile('../artifacts/home-labels/voice/desktop-diagnostic.json',JSON.stringify(diagnostic,null,2)+'\n');
    console.log(JSON.stringify(diagnostic));
    throw error;
  }
  const project = await page.evaluate(() => JSON.parse(localStorage.getItem('barcodemate.home.v1')));
  assert.equal(project.bilingual, true);
  assert.equal(project.outputLanguage, 'zh-Hans');
  assert.deepEqual(project.items.map(i => [i.name, i.quantity]).sort(), [['盐',2],['糖',3],['面粉',1]].sort());
  await page.waitForFunction(() => document.querySelector('.hm-preview iframe')?.contentDocument?.querySelectorAll('.label').length === 6);
  if (dryRun) {
    const audio = await app.evaluate(() => globalThis.voiceChecks);
    console.log(JSON.stringify({dryRun:true,realApiRequests:0,audio}));
    assert(audio[0]?.rms > 50, 'Captured audio is silent');
    await app.close();
    process.exit(0);
  }
  const file = path.resolve('../artifacts/home-labels/voice/desktop-labels.pdf');
  await app.evaluate(({dialog}, file) => { dialog.showSaveDialog = async () => ({canceled:false, filePath:file}); }, file);
  await page.getByRole('button', {name:'保存 PDF', exact:true}).click();
  for (let i = 0; i < 50; i++) {
    if (await readFile(file).then(b => b.subarray(0,4).toString() === '%PDF').catch(() => false)) break;
    await page.waitForTimeout(100);
  }
  assert.equal((await readFile(file)).subarray(0,4).toString(), '%PDF');
  await page.screenshot({path:'../artifacts/home-labels/voice/desktop-preview.png', fullPage:true});
  assert.deepEqual(errors, []);
  const report = {checkedAt:new Date().toISOString(), syntheticAudio:true, audioSource:'Web Audio WAV injection after fake-device permission probe; physical microphone not tested', realProvider:true, platform:process.platform, nativePdf:true, secondsAfterStopIncludingExport:(Date.now()-started)/1000, project, errors};
  await writeFile('../artifacts/home-labels/voice/desktop-live.json', JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({items:project.items.map(({name,second,quantity})=>({name,second,quantity})), bilingual:project.bilingual, nativePdf:true, errors}));
} finally { await app.close(); }
