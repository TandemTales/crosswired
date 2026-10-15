// Optional browser QA: uses an existing installation, never downloads a browser.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'C:/Python312/Lib/site-packages/playwright/driver/package');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/jshun/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe',timeout:20000});
const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const errors=[],failures=[],checks=[];
const artifactDirectory=process.env.CROSSWIRED_ARTIFACT_DIR||'.preview';
const artifactPath=name=>`${artifactDirectory}/${name}`;
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url());});
const snapshot=()=>page.evaluate(()=>window.crosswired.snapshot());
const check=name=>{checks.push(name);console.log('PASS '+name);};
const click=label=>page.getByRole('button',{name:label==='Launch bout'?/^Launch bout/:label,exact:true}).click();
await mkdir(artifactDirectory,{recursive:true});
try{
  await page.clock.install();
  await page.goto(process.env.CROSSWIRED_URL||'http://127.0.0.1:4187');await page.waitForFunction(()=>!!window.crosswired);await page.clock.runFor(100);
  assert.equal(await page.title(),'Crosswired — Build your controls');assert.equal(await page.locator('.component').count(),8);
  await page.screenshot({path:artifactPath('desktop-workbench.png'),fullPage:true});check('desktop initial circuit and arena render');
  await page.keyboard.down('w');await page.clock.runFor(100);assert.equal((await snapshot()).signal.control.throttle,1);assert.equal(await page.locator('.wire.active').count(),1);await page.screenshot({path:artifactPath('desktop-signal.png'),fullPage:true});await page.keyboard.up('w');check('bench key produces visible pulse and live telemetry');
  await click('Clear wires');await page.clock.runFor(50);assert.equal((await snapshot()).design.wires.length,0);
  await click('W OUT out');await click('Drive motor IN forward');assert.equal((await snapshot()).design.wires.length,1);
  await click('A OUT out');await click('Drive motor IN forward');assert.match(await page.locator('#notice').innerText(),/occupied/);assert.equal((await snapshot()).design.wires.length,1);
  await page.keyboard.press('Escape');check('wire editor creates patches and rejects occupied inputs');
  await click('Restore starter wiring');
  await page.locator('[data-tool="move"]').click();await page.locator('.component[data-id="key0"]').click();await click('Cell 5, 2');assert.match(await page.locator('#notice').innerText(),/Does not fit/);assert.equal((await snapshot()).design.components.find(c=>c.id==='key0').x,0);
  await click('Cell 3, 1');assert.equal((await snapshot()).design.components.find(c=>c.id==='key0').x,2);check('move editor blocks overlaps and accepts a free footprint');
  await page.locator('[data-tool="remove"]').click();await page.locator('.component[data-id="key0"]').click();assert.equal((await snapshot()).design.components.length,7);assert.equal((await snapshot()).design.wires.length,4);
  const receiver=page.locator('.tray-part').filter({hasText:'W receiver'});await receiver.click();await click('Cell 1, 2');assert.equal((await snapshot()).design.components.length,8);
  await page.reload();await page.waitForFunction(()=>!!window.crosswired);assert.equal((await snapshot()).design.components.length,8);check('remove, tray placement and local circuit persistence work');
  await click('Restore starter wiring');await page.locator('.tray-part').filter({hasText:'OR relay'}).click();await click('Cell 4, 3');assert.equal((await snapshot()).design.components.length,9);
  await page.locator('#wireDetails summary').click();await page.getByRole('button',{name:'Disconnect SPACE → Pulse cannon / fire',exact:true}).click();
  await click('SPACE OUT out');await click('OR relay IN a');await click('OR relay OUT out');await click('Pulse cannon IN fire');await page.keyboard.down('Space');await page.clock.runFor(100);assert.equal((await snapshot()).signal.control.fire,true);assert.equal(await page.locator('.wire.active').count(),2);await page.keyboard.up('Space');check('placed logic relay propagates to real weapon output');
  await click('Restore starter wiring');await click('Launch bout');await page.keyboard.down('w');await page.clock.runFor(500);await page.keyboard.up('w');assert.ok((await snapshot()).match.player.x>240);await page.keyboard.down('d');await page.clock.runFor(250);await page.keyboard.up('d');assert.ok((await snapshot()).match.player.angle>.5);
  await page.keyboard.press('Escape');const paused=(await snapshot()).match.time;await page.clock.runFor(1000);assert.equal((await snapshot()).match.time,paused);await click('Resume bout');await page.clock.runFor(100);assert.ok((await snapshot()).match.time>paused);await page.screenshot({path:artifactPath('desktop-combat.png'),fullPage:true});check('actual keyboard movement, turning, pause and resume work');
  await click('Retry bout ↻');await page.keyboard.down('Space');await page.clock.runFor(10000);await page.keyboard.up('Space');assert.equal((await snapshot()).match.state,'won');await page.screenshot({path:artifactPath('desktop-victory.png'),fullPage:true});
  await page.locator('[data-salvage="timer"]').click();assert.equal((await snapshot()).design.round,2);assert.ok((await snapshot()).design.inventory.includes('timer'));assert.equal((await snapshot()).mode,'bench');
  await page.locator('.tray-part').filter({hasText:'Clock'}).click();await click('Cell 4, 2');await page.locator('#wireDetails summary').click();
  // Details may have remained open across the rebuild; force an accessible open state.
  await page.locator('#wireDetails').evaluate(e=>e.open=true);await page.getByRole('button',{name:'Disconnect SPACE → Pulse cannon / fire',exact:true}).click();await click('Clock / 0.8s OUT out');await click('Pulse cannon IN fire');await click('Launch bout');await page.clock.runFor(16000);assert.equal((await snapshot()).match.state,'won');check('win → salvage → fit clock → automatic weapon → second victory');
  await page.locator('[data-salvage="armor"]').click();assert.equal((await snapshot()).design.round,3);await page.locator('.tray-part').filter({hasText:'Armor'}).click();await click('Cell 3, 3');await click('Launch bout');assert.equal((await snapshot()).match.player.maxHp,130);await page.clock.runFor(18000);assert.equal((await snapshot()).match.state,'won');assert.match(await page.locator('#overlay').innerText(),/Circuit proven/);check('third bout, physical armor health and complete run');
  await page.locator('#resultAction').click();await click('Launch bout');await page.clock.runFor(45000);assert.equal((await snapshot()).match.state,'lost');check('AI can defeat an idle opponent and shows loss controls');
  await page.locator('#overlay').getByRole('button',{name:'Edit circuit',exact:true}).click();for(let i=0;i<6;i++){await click('Retry bout ↻');await page.clock.runFor(100);await click('Edit circuit');assert.equal((await snapshot()).match.time,0);assert.equal((await snapshot()).match.bullets.length,0);assert.equal((await snapshot()).mode,'bench');}check('six browser edit/retry cycles reset cleanly');
  await page.locator('#chassis').selectOption('hauler');assert.equal(await page.locator('.cell').count(),54);assert.equal((await snapshot()).match.player.maxHp,125);await page.locator('#chassis').selectOption('scout');check('chassis switches board dimensions and robot stats');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:artifactPath('mobile-workbench.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('.board-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));check('mobile layout contains board in horizontal scroller without page overflow');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);check('no browser exceptions or failed asset requests');
}catch(error){await page.screenshot({path:artifactPath('failure.png'),fullPage:true});throw error;}finally{await writeFile(artifactPath('browser-results.json'),JSON.stringify({checks,errors,failedRequests:failures},null,2));await browser.close();}
