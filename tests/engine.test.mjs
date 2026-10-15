import test from 'node:test';
import assert from 'node:assert/strict';
import {starter,canPlace,wireError,validate,evaluate,createMatch,stepMatch,claimSalvage} from '../engine.js';
const keys=(...k)=>new Set(k);
function simulate(match,design,input,seconds){for(let i=0;i<seconds*60;i++)stepMatch(match,design,input,1/60);return match;}
test('starter occupies valid chassis cells; all keys propagate to the correct output',()=>{
  const d=starter();assert.deepEqual(validate(d),[]);
  const expected={W:[1,0,false],S:[-1,0,false],A:[0,-1,false],D:[0,1,false],Space:[0,0,true]};
  for(const[k,want]of Object.entries(expected)){const s=evaluate(d,keys(k));assert.deepEqual(Object.values(s.control),want);assert.equal(s.active.size,1);}
  assert.deepEqual(evaluate(d,keys('W','S','A','D')).control,{throttle:0,turn:0,fire:false});
});
test('physical rewiring changes actual controls and a cut wire disables the actuator',()=>{
  const d=starter();d.wires=d.wires.filter(w=>w.to!=='drive');const m=createMatch(d);simulate(m,d,keys('W'),.5);assert.equal(m.player.x,180);
  d.wires.push({from:'key1',out:'out',to:'drive',input:'forward'});simulate(m,d,keys('A'),.25);assert.ok(m.player.x>190);assert.ok(m.player.angle<0);
  assert.equal(evaluate(d,keys('W')).control.throttle,0);
});
test('invalid wiring rejects occupied input, reversed endpoints, missing parts, self feedback and cycles',()=>{
  const d=starter(),w={from:'key1',out:'out',to:'drive',input:'forward'};assert.match(wireError(d,w),/occupied/);
  assert.match(wireError(d,{from:'drive',out:'forward',to:'key0',input:'out'}),/output/);
  assert.match(wireError(d,{...w,from:'missing'}),/installed/);
  d.components.push({id:'r1',type:'relay',x:3,y:1},{id:'r2',type:'relay',x:3,y:2});
  assert.match(wireError(d,{from:'r1',out:'out',to:'r1',input:'a'}),/itself/);
  d.wires.push({from:'r1',out:'out',to:'r2',input:'a'});
  assert.match(wireError(d,{from:'r2',out:'out',to:'r1',input:'a'}),/Feedback/);
  const malformed={...d,wires:[...d.wires,{from:'r2',out:'out',to:'r1',input:'a'}]};assert.ok(validate(malformed).length);assert.doesNotThrow(()=>evaluate(malformed,keys('W')));
});
test('relay combines keys, branches and timer produces automatic firing pulses',()=>{
  const d=starter();d.components.push({id:'r1',type:'relay',x:3,y:2});d.wires=d.wires.filter(w=>w.to!=='gun');
  d.wires.push({from:'key0',out:'out',to:'r1',input:'a'},{from:'key4',out:'out',to:'r1',input:'b'},{from:'r1',out:'out',to:'gun',input:'fire'});
  assert.deepEqual(validate(d),[]);assert.equal(evaluate(d,keys('W')).control.fire,true);assert.equal(evaluate(d,keys('Space')).control.fire,true);assert.equal(evaluate(d,keys()).control.fire,false);assert.equal(evaluate(d,keys('W')).active.size,3);
  d.components.push({id:'clock',type:'timer',x:3,y:1});d.wires=d.wires.filter(w=>w.to!=='gun');d.wires.push({from:'clock',out:'out',to:'gun',input:'fire'});
  assert.equal(evaluate(d,keys(),.1).control.fire,true);assert.equal(evaluate(d,keys(),.4).control.fire,false);assert.equal(evaluate(d,keys(),.85).control.fire,true);
});
test('placement enforces shapes, overlap, bounds and changing chassis dimensions',()=>{
  const d=starter(),part={id:'new',type:'relay'};
  assert.equal(canPlace(d,part,0,0),false);assert.equal(canPlace(d,part,1,1),false);assert.equal(canPlace(d,part,7,2),false);assert.equal(canPlace(d,part,-1,2),false);assert.equal(canPlace(d,part,3,2),true);assert.equal(canPlace(d,part,3.5,2),false);
  const drive=d.components.find(c=>c.id==='drive');assert.equal(canPlace(d,drive,5,0),true);
  d.chassis='hauler';assert.equal(canPlace(d,part,7,2),true);assert.equal(createMatch(d).player.hp,125);
});
test('drive, reverse, turn and wall confinement respond through circuit',()=>{
  const d=starter(),m=createMatch(d);simulate(m,d,keys('W'),.5);assert.ok(m.player.x>250);simulate(m,d,keys('S'),.5);assert.ok(Math.abs(m.player.x-180)<.001);simulate(m,d,keys('D'),.5);assert.ok(m.player.angle>1.3);
  m.player.angle=Math.PI;m.player.x=26;simulate(m,d,keys('W'),.5);assert.equal(m.player.x,25);assert.ok(Number.isFinite(m.player.y));
});
test('weapon damages AI, wins, and frozen results cannot continue simulation',()=>{
  const d=starter(),m=createMatch(d);simulate(m,d,keys('Space'),10);assert.equal(m.state,'won');assert.equal(m.enemy.hp,0);assert.ok(m.hits>=7);assert.ok(m.player.hp>0);const time=m.time;stepMatch(m,d,keys('W'),.05);assert.equal(m.time,time);
});
test('unarmed idle robot can lose to AI; timeout ends disconnected evasive stalemate',()=>{
  const d=starter(),m=createMatch(d);simulate(m,d,keys(),45);assert.equal(m.state,'lost');assert.equal(m.player.hp,0);
  const timeout=createMatch(d);timeout.time=89.99;stepMatch(timeout,d,keys(),.02);assert.equal(timeout.state,'timeout');
});
test('armor, bounded salvage and three-round run use consistent stats',()=>{
  const d=starter();assert.equal(claimSalvage(d,'unknown'),false);assert.equal(claimSalvage(d,'armor'),true);assert.equal(d.round,2);assert.ok(d.inventory.includes('armor'));d.components.push({id:'armor',type:'armor',x:2,y:0});assert.equal(createMatch(d).player.hp,130);assert.equal(createMatch(d).enemy.hp,80);assert.equal(claimSalvage(d,'timer'),true);assert.equal(d.round,3);assert.equal(claimSalvage(d,'relay'),false);
});
test('100 reset/edit/retry cycles retain circuit but clear time, bullets, health, cooldowns and results',()=>{
  const d=starter();for(let i=0;i<100;i++){d.wires=d.wires.filter(w=>!(w.to==='gun'));if(i%2)d.wires.push({from:'key4',out:'out',to:'gun',input:'fire'});const m=createMatch(d);assert.equal(m.time,0);assert.equal(m.state,'playing');assert.equal(m.bullets.length,0);assert.equal(m.player.hp,100);assert.equal(m.player.cooldown,0);assert.deepEqual(validate(d),[]);simulate(m,d,keys('Space','W'),.1);assert.equal(m.shots,i%2?1:0);assert.ok(m.player.x>180);}
});
