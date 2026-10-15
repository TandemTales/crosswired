import {CHASSIS,TYPES,starter,canPlace,wireError,validate,evaluate,createMatch,stepMatch,claimSalvage} from './engine.js';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',CELL=64;
let design=starter(),tool='wire',pending=null,selected=null,placement=null,keys=new Set(),mode='bench',match,signal,last=0,wirePaths=[],cardNodes=[],portNodes=[],savedMessage='';
try {const saved=JSON.parse(localStorage.getItem('crosswired-v1'));if(saved&&Array.isArray(saved.components)&&Array.isArray(saved.wires)&&Array.isArray(saved.inventory)&&[1,2,3].includes(saved.round)&&saved.inventory.every(t=>typeof t==='string'?!!TYPES[t]:t?.type==='key'&&['W','A','S','D','Space'].includes(t.key))&&saved.components.every(c=>TYPES[c.type]&&typeof c.id==='string'&&c.id.length<45&&/^[\w-]+$/.test(c.id)&&(!c.key||['W','A','S','D','Space'].includes(c.key)))&&!validate(saved).length) {design=saved;savedMessage='Local circuit restored. Hold a key to trace its signal.';}}catch{}
match=createMatch(design);
function save(){try{localStorage.setItem('crosswired-v1',JSON.stringify(design));}catch{}}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function editing(){if(mode!=='bench'){notice('Return to the bench to edit this circuit.',true);return false;}return true;}
function mutate(message){pending=null;selected=null;placement=null;keys.clear();save();match=createMatch(design);renderBoard();renderTray();showReady();notice(message);}
const short=c=>c.type==='key'?(c.key==='Space'?'SPACE':c.key):TYPES[c.type].name;
function svg(tag,attrs){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
function renderBoard(){
  const board=$('board'),ch=CHASSIS[design.chassis];board.replaceChildren();board.style.width=ch.cols*CELL+'px';board.style.height=ch.rows*CELL+'px';
  $('chassis').value=design.chassis;$('spaceUsed').textContent=`${design.components.reduce((n,c)=>n+TYPES[c.type].w*TYPES[c.type].h,0)} / ${ch.cols*ch.rows-ch.blocked.length} CELLS`;
  for(let y=0;y<ch.rows;y++)for(let x=0;x<ch.cols;x++){
    const blocked=ch.blocked.some(([xx,yy])=>xx===x&&yy===y),cell=document.createElement('button');cell.className='cell'+(blocked?' blocked':'');cell.style.cssText=`left:${x*CELL+2}px;top:${y*CELL+2}px;width:60px;height:60px`;cell.disabled=blocked;cell.setAttribute('aria-label',`Cell ${x+1}, ${y+1}${blocked?' unavailable':''}`);cell.onclick=()=>placeAt(x,y);board.append(cell);
  }
  cardNodes=[];portNodes=[];
  for(const c of design.components){
    const t=TYPES[c.type],card=document.createElement('div');card.className=`component kind-${t.kind}`;card.dataset.id=c.id;card.style.cssText=`left:${c.x*CELL+5}px;top:${c.y*CELL+5}px;width:${t.w*CELL-10}px;height:${t.h*CELL-10}px`;card.setAttribute('role','group');card.setAttribute('aria-label',short(c));
    const label=document.createElement('span');label.className='component-name';label.textContent=t.name;card.append(label);
    const symbol=document.createElement('span');symbol.className='component-symbol';symbol.textContent={key:c.key==='Space'?'SPACE':c.key,drive:'↟',steer:'↻',gun:'⊕',relay:'OR',timer:'◷',armor:'▣'}[c.type];card.append(symbol);
    card.tabIndex=0;card.onclick=e=>{if(!e.target.closest('.port'))selectCard(c);};card.onkeydown=e=>{if(e.target!==card)return;if(e.key==='Enter'){selectCard(c);e.preventDefault();}};
    for(const direction of ['ins','outs'])t[direction].forEach((port,i)=>{
      const y=t.h===1?(direction==='ins'&&t.ins.length>1?26+i*48:50):44+i*31,b=document.createElement('button');b.className=`port ${direction==='ins'?'in':'out'}`;b.style.top=y+'%';b.textContent='›';b.title=`${short(c)} ${direction==='ins'?'IN':'OUT'} ${port}`;b.setAttribute('aria-label',b.title);b.onclick=e=>{e.stopPropagation();connect(c,port,direction);};card.append(b);portNodes.push({node:b,c,port,direction});
      if(direction==='ins'){const caption=document.createElement('span');caption.className='port-label';caption.style.top=y+'%';caption.textContent=port.toUpperCase();card.append(caption);}
    });board.append(card);cardNodes.push({node:card,c});
  }
  const layer=svg('svg',{id:'wires',width:ch.cols*CELL,height:ch.rows*CELL,'aria-hidden':'true'});board.append(layer);wirePaths=[];
  for(const [i,w]of design.wires.entries()){
    const a=portNodes.find(p=>p.c.id===w.from&&p.direction==='outs'&&p.port===w.out),b=portNodes.find(p=>p.c.id===w.to&&p.direction==='ins'&&p.port===w.input);if(!a||!b)continue;
    const pos=p=>({x:p.c.x*CELL+5+(p.direction==='ins'?2:TYPES[p.c.type].w*CELL-12),y:p.c.y*CELL+5+(TYPES[p.c.type].h*CELL-10)*parseFloat(p.node.style.top)/100});
    const s=pos(a),e=pos(b),bend=Math.max(35,Math.abs(e.x-s.x)*0.44);const d=`M ${s.x} ${s.y} C ${s.x+bend} ${s.y}, ${e.x-bend} ${e.y}, ${e.x} ${e.y}`;
    layer.append(svg('path',{d,class:'wire-shadow'}));const path=svg('path',{d,class:'wire'});layer.append(path);wirePaths.push({node:path,i});
  }
  $('wireCount').textContent=design.wires.length+' PATCHES';$('wireList').replaceChildren();
  design.wires.forEach((w,i)=>{const row=document.createElement('div');row.className='wire-row';const text=document.createElement('span');text.textContent=`${short(design.components.find(c=>c.id===w.from))} → ${short(design.components.find(c=>c.id===w.to))} / ${w.input}`;const remove=document.createElement('button');remove.textContent='Disconnect ×';remove.setAttribute('aria-label','Disconnect '+text.textContent);remove.onclick=()=>{if(editing()){design.wires.splice(i,1);mutate('Wire removed. That input receives no signal until reconnected.');}};row.append(text,remove);$('wireList').append(row);});
  updateSelection();
}
function updateSelection(){for(const p of portNodes)p.node.classList.toggle('pending',pending?.from===p.c.id&&pending?.out===p.port&&p.direction==='outs');for(const c of cardNodes)c.node.classList.toggle('chosen',selected===c.c.id);}
function connect(c,port,direction){
  if(!editing())return;
  if(tool!=='wire'){setTool('wire');}
  if(direction==='outs'){pending={from:c.id,out:port};notice(`${short(c)} OUT selected. Click the destination IN port. Escape cancels.`);updateSelection();return;}
  if(!pending){notice('Start at an OUT port, then click an IN port.',true);return;}
  const w={...pending,to:c.id,input:port},error=wireError(design,w);
  if(error){notice(error,true);return;}
  design.wires.push(w);mutate('Patched. Hold the source key and watch the signal travel.');
}
function setTool(next){tool=next;pending=null;selected=null;placement=null;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('selected',b.dataset.tool===tool));renderTray();updateSelection();notice({wire:'Click an OUT port, then a destination IN port.',move:'Click a component, then an empty cell for its new top-left corner.',remove:'Click a component to return it to the tray. Its wires will be removed.'}[tool]);}
function selectCard(c){if(!editing())return;if(tool==='remove'){design.components=design.components.filter(x=>x.id!==c.id);design.wires=design.wires.filter(w=>w.from!==c.id&&w.to!==c.id);design.inventory.push(c.type==='key'?{type:'key',key:c.key}:c.type);mutate(`${short(c)} returned to the tray.`);}else if(tool==='move'){selected=c.id;placement=null;updateSelection();notice(`${short(c)} selected. Click a cell for its new top-left corner.`);}else notice('Use the circular OUT and IN ports to wire. Choose Move to reposition a card.');}
function placeAt(x,y){
  if(!editing())return;
  const existing=design.components.find(c=>c.id===selected),part=placement===null?null:design.inventory[placement];
  if(!existing&&!part){pending=null;updateSelection();notice('Choose a tray component or select a card in Move mode.');return;}
  const c=existing||{id:'part-'+crypto.randomUUID(),...(typeof part==='string'?{type:part}:part)};
  if(!canPlace(design,c,x,y)){notice('Does not fit: components must stay inside the chassis without overlapping.',true);return;}
  c.x=x;c.y=y;if(!existing){design.components.push(c);design.inventory.splice(placement,1);}mutate(`${short(c)} installed. Connect its ports to make it work.`);
}
function renderTray(){
  $('tray').replaceChildren();
  if(!design.inventory.length){const e=document.createElement('span');e.className='muted small';e.textContent='Tray empty. Win a bout to salvage a new component.';$('tray').append(e);}
  design.inventory.forEach((part,i)=>{const t=typeof part==='string'?part:part.type,b=document.createElement('button');b.className='tray-part'+(placement===i?' selected':'');b.textContent=t==='key'?`${part.key} receiver`:TYPES[t].name;const size=document.createElement('span');size.textContent=`${TYPES[t].w}×${TYPES[t].h}`;b.append(size);b.onclick=()=>{if(!editing())return;pending=null;selected=null;placement=i;renderTray();updateSelection();notice(`${b.firstChild.textContent} selected. Click a free cell for its top-left corner.`);};$('tray').append(b);});
}
function showReady(){mode='bench';$('modeTag').textContent='BENCH LIVE';$('arenaTag').textContent='AWAITING LAUNCH';$('arenaTag').className='tag amber';$('roundTitle').innerHTML=`Bout 0${design.round} <span>/ 03</span>`;$('pauseButton').disabled=true;$('pauseButton').textContent='Pause';$('overlay').classList.remove('hidden');$('overlay').innerHTML='<div class="overlay-card"><span class="eyebrow">READY WHEN YOU ARE</span><h3>Your wiring.<br>Your fighting chance.</h3><p>The circuit on the left is your control scheme.<br>Hold keys to trace it, then enter the arena.</p><button class="primary" id="startBout">Launch bout <span>↗</span></button></div>';$('startBout').onclick=launch;$('chassis').disabled=false;}
function launch(){const errors=validate(design);if(errors.length){notice(errors.join(' '),true);return;}keys.clear();pending=null;selected=null;placement=null;updateSelection();renderTray();match=createMatch(design);mode='combat';$('overlay').classList.add('hidden');$('modeTag').textContent='CIRCUIT LOCKED';$('arenaTag').textContent='COMBAT LIVE';$('arenaTag').className='tag';$('pauseButton').disabled=false;$('pauseButton').textContent='Pause';$('chassis').disabled=true;document.activeElement?.blur();notice('Combat live. Hold your wired keys. Escape pauses; Edit circuit returns to the bench.');}
function pause(){if(!['combat','paused'].includes(mode))return;if(mode==='paused'){mode='combat';$('overlay').classList.add('hidden');$('pauseButton').textContent='Pause';$('arenaTag').textContent='COMBAT LIVE';document.activeElement?.blur();}else{mode='paused';keys.clear();$('pauseButton').textContent='Resume';$('arenaTag').textContent='PAUSED';$('overlay').classList.remove('hidden');$('overlay').innerHTML='<div class="overlay-card"><span class="eyebrow">SIGNAL HOLD</span><h3>Take a breath.</h3><p>Your bout is paused.</p><button id="resume" class="primary">Resume bout</button></div>';$('resume').onclick=pause;}}
function edit(){keys.clear();match=createMatch(design);pending=null;selected=null;placement=null;showReady();renderTray();updateSelection();notice('Back on the bench. The next launch starts a fresh bout with this circuit.');}
function finish(){
  mode='result';keys.clear();$('pauseButton').disabled=true;$('arenaTag').textContent=match.state==='won'?'BOUT WON':match.state==='timeout'?'TIME EXPIRED':'CHASSIS DISABLED';$('overlay').classList.remove('hidden');
  const won=match.state==='won',complete=won&&design.round===3;
  $('overlay').innerHTML=`<div class="overlay-card"><span class="eyebrow">${complete?'THREE BOUTS. ONE MACHINE.':won?'VICTORY / SALVAGE AVAILABLE':'REBUILD. REWIRE. RETURN.'}</span><h3>${complete?'Circuit proven.':won?'Make room for more.':match.state==='timeout'?'Time ran out.':'Back to the workbench.'}</h3><p>${won?`${match.hits} hits · ${Math.round(match.time)} seconds. `:'Tune your controls and take another shot. '}${complete?'Start a new run to experiment again.':won?'Choose one part for the next bout.':'Your circuit is kept for the retry.'}</p>${won&&!complete?'<div class="salvage"><button data-salvage="timer">Clock<small>2×1 · Pulses every 0.8s</small></button><button data-salvage="armor">Armor<small>2×2 · Adds 30 health</small></button><button data-salvage="relay">OR relay<small>2×1 · Combines signals</small></button></div>':`<div class="overlay-actions"><button id="resultAction" class="primary">${complete?'New run':'Edit circuit'}</button>${!complete?'<button id="resultRetry" class="quiet">Retry bout ↻</button>':''}</div>`}</div>`;
  document.querySelectorAll('[data-salvage]').forEach(b=>b.onclick=()=>{if(mode!=='result'||match.state!=='won')return;if(claimSalvage(design,b.dataset.salvage)){mutate('Salvage acquired. Fit it into your chassis before the next bout.');}});
  if($('resultAction'))$('resultAction').onclick=complete?newRun:edit;if($('resultRetry'))$('resultRetry').onclick=launch;
  notice(won?'Bout won. Choose salvage to continue.':'Bout ended. Edit your circuit or retry.');
}
function newRun(){design=starter();mutate('New run ready. The starter wiring is connected.');}
function signals(){
  for(const p of portNodes)p.node.classList.toggle('active',!!(p.direction==='outs'?signal.outputs[p.c.id]:signal.inputs[p.c.id+':'+p.port]));
  for(const w of wirePaths)w.node.classList.toggle('active',signal.active.has(w.i));
  $('driveRead').innerHTML=`DRIVE <b>${signal.control.throttle>0?'+':''}${signal.control.throttle}</b>`;$('turnRead').innerHTML=`TURN <b>${signal.control.turn>0?'+':''}${signal.control.turn}</b>`;$('fireRead').innerHTML=`CANNON <b>${signal.control.fire?'ON':'OFF'}</b>`;
  for(const[id,bot]of[['player',match.player],['enemy',match.enemy]]){$(id+'Hp').textContent=Math.ceil(bot.hp);$(id+'Health').style.width=bot.hp/bot.maxHp*100+'%';}
  $('clock').textContent=`${String(Math.floor(match.time/60)).padStart(2,'0')}:${String(Math.floor(match.time%60)).padStart(2,'0')} / 01:30`;
}
const ctx=$('arena').getContext('2d');
function draw(){
  const g=ctx;g.clearRect(0,0,900,600);g.fillStyle='#101e25';g.fillRect(0,0,900,600);
  g.strokeStyle='#21363e';g.lineWidth=1;for(let x=0;x<=900;x+=50){g.beginPath();g.moveTo(x,0);g.lineTo(x,600);g.stroke();}for(let y=0;y<=600;y+=50){g.beginPath();g.moveTo(0,y);g.lineTo(900,y);g.stroke();}
  g.strokeStyle='#35494d';g.lineWidth=2;g.strokeRect(18,18,864,564);g.setLineDash([5,8]);g.beginPath();g.arc(450,300,105,0,Math.PI*2);g.moveTo(450,18);g.lineTo(450,582);g.stroke();g.setLineDash([]);
  g.fillStyle='#6b858a';g.font='11px Consolas, monospace';g.fillText('CROSSWIRED / TEST CELL 01',36,44);g.fillText('900 × 600',780,564);
  for(const [bot,color,label]of[[match.player,'#c1ef85','YOU'],[match.enemy,'#c899ed','AI']]){
    g.save();g.translate(bot.x,bot.y);g.rotate(bot.angle);g.fillStyle='#0005';g.fillRect(-23,-19,52,44);g.fillStyle='#33454c';g.fillRect(-22,-25,42,10);g.fillRect(-22,15,42,10);g.fillStyle=bot.hit>0?'#fff4d3':color;g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(-20,-15);g.lineTo(13,-15);g.lineTo(24,-7);g.lineTo(24,7);g.lineTo(13,15);g.lineTo(-20,15);g.closePath();g.fill();g.fillStyle='#1d3336';g.fillRect(-11,-9,20,18);g.fillStyle=color;g.fillRect(5,-4,29,8);g.fillStyle='#172b30';g.fillRect(-6,-4,9,8);g.restore();
    g.textAlign='center';g.fillStyle=color;g.font='10px Consolas,monospace';g.fillText(label,bot.x,bot.y-37);g.textAlign='left';
  }
  for(const b of match.bullets){g.save();g.strokeStyle=b.owner==='player'?'#dcffa6':'#dfb1ff';g.shadowColor=g.strokeStyle;g.shadowBlur=12;g.lineWidth=5;g.beginPath();g.moveTo(b.x-Math.cos(b.angle)*10,b.y-Math.sin(b.angle)*10);g.lineTo(b.x,b.y);g.stroke();g.restore();}
  for(const s of match.sparks){g.strokeStyle='#ffdf9a';g.lineWidth=2;g.beginPath();g.arc(s.x,s.y,(.3-s.life)*85,0,Math.PI*2);g.stroke();}
  if(mode==='bench'){g.fillStyle='#8ca5a0';g.font='11px Consolas,monospace';g.fillText('BENCH SIGNALS LIVE · ARENA SAFE',36,566);}
}
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(mode==='combat'){signal=stepMatch(match,design,keys,dt);if(match.state!=='playing')finish();}else signal=evaluate(design,mode==='bench'?keys:new Set(),mode==='bench'?now/1000:match.time);signals();draw();requestAnimationFrame(frame);}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{if(editing())setTool(b.dataset.tool);});
$('clearWires').onclick=()=>{if(editing()){design.wires=[];mutate('All wires removed. Nothing moves or fires until you connect its inputs.');}};
$('chassis').onchange=e=>{if(!editing())return;const previous=design.chassis;design.chassis=e.target.value;if(validate(design).length){design.chassis=previous;e.target.value=previous;notice('That chassis cannot fit this layout. Move parts inward first.',true);return;}mutate('Chassis changed. Board space, health and speed follow the selected body.');};
$('restore').onclick=()=>{if(!editing())return;const base=starter(),salvage=[...design.inventory.filter(p=>p==='timer'||p==='armor'),...design.components.filter(c=>c.type==='timer'||c.type==='armor').map(c=>c.type)];design.components=base.components;design.wires=base.wires;design.inventory=['relay',...salvage];mutate('Starter components and wiring restored. Salvaged clock and armor cards stay in the tray.');};
$('newRun').onclick=newRun;$('pauseButton').onclick=pause;$('editButton').onclick=edit;$('retryButton').onclick=launch;
$('helpButton').onclick=()=>{$('guide').open=!$('guide').open;if($('guide').open)$('guide').scrollIntoView({behavior:'smooth',block:'center'});};
const keyName=e=>e.code==='Space'?'Space':['KeyW','KeyA','KeyS','KeyD'].includes(e.code)?e.code.slice(3):null;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){pending=null;selected=null;placement=null;updateSelection();renderTray();pause();return;}const name=keyName(e);if(!name||e.target.closest('select,input,textarea'))return;if(['bench','combat'].includes(mode)){e.preventDefault();keys.add(name);}});
document.addEventListener('keyup',e=>{const name=keyName(e);if(name)keys.delete(name);});
window.addEventListener('blur',()=>{keys.clear();if(mode==='combat')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(mode==='combat')pause();}});
// Read-only inspection surface for local QA and learning how signals reach actuators.
window.crosswired=Object.freeze({snapshot:()=>structuredClone({design,mode,match,signal:signal?{...signal,active:[...signal.active]}:null})});
renderBoard();renderTray();showReady();if(savedMessage)notice(savedMessage);requestAnimationFrame(frame);
