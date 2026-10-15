export const CHASSIS = {
  scout: { name: 'Kite / Scout', cols: 8, rows: 6, hp: 100, speed: 150, blocked: [[0,0],[0,5],[7,0],[7,5]] },
  hauler: { name: 'Brick / Hauler', cols: 9, rows: 6, hp: 125, speed: 120, blocked: [[0,0],[8,0]] }
};
export const TYPES = {
  key: { name: 'Receiver', w: 2, h: 1, ins: [], outs: ['out'], kind: 'input' },
  drive: { name: 'Drive motor', w: 2, h: 2, ins: ['forward','reverse'], outs: [], kind: 'hardware' },
  steer: { name: 'Steering motor', w: 2, h: 2, ins: ['left','right'], outs: [], kind: 'hardware' },
  gun: { name: 'Pulse cannon', w: 2, h: 2, ins: ['fire'], outs: [], kind: 'weapon' },
  relay: { name: 'OR relay', w: 2, h: 1, ins: ['a','b'], outs: ['out'], kind: 'logic' },
  timer: { name: 'Clock / 0.8s', w: 2, h: 1, ins: [], outs: ['out'], kind: 'logic' },
  armor: { name: 'Armor / +30 HP', w: 2, h: 2, ins: [], outs: [], kind: 'hardware' }
};
export function starter() {
  const components = ['W','A','S','D'].map((key,i)=>({id:'key'+i,type:'key',key,x:0,y:i+1}));
  components.push({id:'key4',type:'key',key:'Space',x:3,y:4});
  components.push({id:'drive',type:'drive',x:5,y:0},{id:'steer',type:'steer',x:5,y:2},{id:'gun',type:'gun',x:5,y:4});
  return {chassis:'scout',components,wires:[
    {from:'key0',out:'out',to:'drive',input:'forward'},
    {from:'key2',out:'out',to:'drive',input:'reverse'},
    {from:'key1',out:'out',to:'steer',input:'left'},
    {from:'key3',out:'out',to:'steer',input:'right'},
    {from:'key4',out:'out',to:'gun',input:'fire'}
  ],inventory:['relay'],round:1};
}
export function canPlace(design, component, x, y) {
  const chassis=CHASSIS[design.chassis], t=TYPES[component.type];
  if(!t || !Number.isInteger(x)||!Number.isInteger(y)) return false;
  for(let yy=y;yy<y+t.h;yy++) for(let xx=x;xx<x+t.w;xx++) {
    if(xx<0||yy<0||xx>=chassis.cols||yy>=chassis.rows||chassis.blocked.some(([bx,by])=>bx===xx&&by===yy)) return false;
    if(design.components.some(c=>c.id!==component.id && xx>=c.x&&xx<c.x+TYPES[c.type].w&&yy>=c.y&&yy<c.y+TYPES[c.type].h)) return false;
  }
  return true;
}
export function wireError(design, wire) {
  const a=design.components.find(c=>c.id===wire.from),b=design.components.find(c=>c.id===wire.to);
  if(!a||!b) return 'Both components must be installed.';
  if(!TYPES[a.type].outs.includes(wire.out)||!TYPES[b.type].ins.includes(wire.input)) return 'Connect an output to an input.';
  if(a.id===b.id) return 'A component cannot feed itself.';
  if(design.wires.some(w=>w.to===wire.to&&w.input===wire.input)) return 'Input occupied. Remove its wire first.';
  const visited=new Set();
  function reaches(id) { if(id===wire.from) return true; if(visited.has(id)) return false; visited.add(id); return design.wires.filter(w=>w.from===id).some(w=>reaches(w.to)); }
  if(reaches(wire.to)) return 'Feedback loops are not supported.';
  return null;
}
export function validate(design) {
  const errors=[];
  if(!CHASSIS[design.chassis]) return ['Unknown chassis.'];
  const ids=new Set();
  for(const c of design.components) {
    if(ids.has(c.id)) errors.push('Duplicate component ID.'); ids.add(c.id);
    if(!canPlace(design,c,c.x,c.y)) errors.push(`Invalid placement: ${c.id}.`);
  }
  const checked={...design,wires:[]};
  for(const w of design.wires) {const e=wireError(checked,w);if(e) errors.push(e);else checked.wires.push(w);}
  return errors;
}
export function evaluate(design, keys=new Set(), time=0) {
  const outputs={}, inputs={}, active=new Set();
  const incoming=new Map(design.wires.map(w=>[w.to+':'+w.input,w]));
  const visiting=new Set();
  function output(id) {
    if(id in outputs) return outputs[id];
    if(visiting.has(id)) return false;
    visiting.add(id);
    const c=design.components.find(c=>c.id===id);
    let value=false;
    if(c?.type==='key') value=keys.has(c.key);
    if(c?.type==='timer') value=(time%0.8)<0.22;
    if(c?.type==='relay') value=input(id,'a')||input(id,'b');
    visiting.delete(id); outputs[id]=value; return value;
  }
  function input(id,port) {
    const wire=incoming.get(id+':'+port);
    const value=!!wire&&output(wire.from);
    inputs[id+':'+port]=value;
    if(value) active.add(design.wires.indexOf(wire));
    return value;
  }
  const control={throttle:0,turn:0,fire:false};
  for(const c of design.components) {
    output(c.id);
    for(const port of TYPES[c.type].ins) input(c.id,port);
    if(c.type==='drive') control.throttle+=Number(input(c.id,'forward'))-Number(input(c.id,'reverse'));
    if(c.type==='steer') control.turn+=Number(input(c.id,'right'))-Number(input(c.id,'left'));
    if(c.type==='gun') control.fire ||= input(c.id,'fire');
  }
  control.throttle=Math.max(-1,Math.min(1,control.throttle));control.turn=Math.max(-1,Math.min(1,control.turn));
  return {outputs,inputs,active,control};
}
export const ARENA={w:900,h:600};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function createMatch(design) {
  const hp=CHASSIS[design.chassis].hp+30*design.components.filter(c=>c.type==='armor').length;
  return {time:0,state:'playing',player:{x:180,y:300,angle:0,hp,maxHp:hp,cooldown:0,hit:0},enemy:{x:720,y:300,angle:Math.PI,hp:65+15*(design.round-1),maxHp:65+15*(design.round-1),cooldown:1.8,hit:0},bullets:[],sparks:[],shots:0,hits:0};
}
function drive(bot,control,speed,dt) {
  bot.angle+=control.turn*2.8*dt;
  bot.x=clamp(bot.x+Math.cos(bot.angle)*control.throttle*speed*dt,25,ARENA.w-25);
  bot.y=clamp(bot.y+Math.sin(bot.angle)*control.throttle*speed*dt,25,ARENA.h-25);
  bot.cooldown=Math.max(0,bot.cooldown-dt);bot.hit=Math.max(0,bot.hit-dt);
}
function shoot(match,bot,owner) {
  const ai=owner==='enemy';
  match.bullets.push({x:bot.x+Math.cos(bot.angle)*30,y:bot.y+Math.sin(bot.angle)*30,angle:bot.angle,speed:ai?245:430,owner,life:2.4});
  bot.cooldown=ai?1.35:0.3;if(!ai) match.shots++;
}
export function stepMatch(match,design,keys,dt) {
  if(match.state!=='playing') return evaluate(design,new Set(),match.time);
  dt=clamp(dt,0,0.05);match.time+=dt;
  const signal=evaluate(design,keys,match.time),p=match.player,e=match.enemy;
  const bearing=Math.atan2(p.y-e.y,p.x-e.x),diff=angleDiff(bearing,e.angle),distance=Math.hypot(p.x-e.x,p.y-e.y);
  const ai={turn:clamp(diff*1.7,-0.7,0.7),throttle:distance>300?0.65:distance<180?-0.25:0};
  drive(p,signal.control,CHASSIS[design.chassis].speed,dt);drive(e,ai,100,dt);
  const overlap=48-Math.hypot(p.x-e.x,p.y-e.y);
  if(overlap>0) {const a=Math.atan2(p.y-e.y,p.x-e.x);p.x=clamp(p.x+Math.cos(a)*overlap/2,25,875);p.y=clamp(p.y+Math.sin(a)*overlap/2,25,575);e.x=clamp(e.x-Math.cos(a)*overlap/2,25,875);e.y=clamp(e.y-Math.sin(a)*overlap/2,25,575);}
  if(signal.control.fire&&p.cooldown<=0) shoot(match,p,'player');
  if(Math.abs(diff)<0.14&&e.cooldown<=0&&match.time>1.5) shoot(match,e,'enemy');
  for(const b of match.bullets) {
    const oldX=b.x,oldY=b.y;b.x+=Math.cos(b.angle)*b.speed*dt;b.y+=Math.sin(b.angle)*b.speed*dt;b.life-=dt;
    const target=b.owner==='player'?e:p,dx=b.x-oldX,dy=b.y-oldY;
    const t=clamp(((target.x-oldX)*dx+(target.y-oldY)*dy)/(dx*dx+dy*dy||1),0,1);
    if(b.life>0&&Math.hypot(oldX+dx*t-target.x,oldY+dy*t-target.y)<25) {
      target.hp=Math.max(0,target.hp-(b.owner==='player'?10:12));target.hit=0.16;b.life=0;
      match.sparks.push({x:b.x,y:b.y,life:0.3});if(b.owner==='player')match.hits++;
    }
  }
  match.bullets=match.bullets.filter(b=>b.life>0&&b.x>0&&b.x<900&&b.y>0&&b.y<600);
  for(const s of match.sparks)s.life-=dt;match.sparks=match.sparks.filter(s=>s.life>0);
  if(p.hp<=0)match.state='lost';else if(e.hp<=0)match.state='won';else if(match.time>=90)match.state='timeout';
  return signal;
}
export function claimSalvage(design,type) {
  if(!['timer','armor','relay'].includes(type)||design.round>=3) return false;
  design.inventory.push(type);design.round++;return true;
}
