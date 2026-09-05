import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {autoDeploy,attackOrder,battleUnitNumbers} from '../lib/deployment.ts';
import {createCampaign,makeRoster,makeEncounter} from '../lib/campaign-engine.ts';
import {createBattle,advanceBattle,initialBattleSnapshot,tickBattle} from '../lib/battle-engine.ts';
import {FieldTraining} from '../app/field-training.tsx';
import {BattleUnitMarker,BattleInspector} from '../app/battle-unit.tsx';
import {BattleDialog} from '../app/battle-dialog.tsx';
import {CampaignMap} from '../app/campaign-map.tsx';
import {makeQuickBattle} from '../app/quick-battle.tsx';
import {battlefieldFeatureAt} from '../lib/simulation-engine.ts';

const roster=(key,id)=>makeRoster(key,id,1),noop=()=>{};
function context(){const c=createCampaign('italy');return makeEncounter(c,c.armies[0],c.armies[1],c.cities[3],false)}

test('missiles start in skirmish on either side and attack targeting preserves it',()=>{
  const units=createBattle([roster('velites',1)],[roster('velites',2)],false,false);
  for(const u of units){assert.equal(u.order,'Skirmish');assert.equal(attackOrder(u),'Skirmish');assert.equal(attackOrder({...u,ammo:0}),'Attack')}
});
test('ranged reinforcement waves arrive skirmishing',()=>{
  const b={...context(),reinforcements:[roster('velites',900)],enemyReinforcements:[roster('velites',901)]};
  const s=tickBattle({...initialBattleSnapshot(b),phase:'fight',elapsed:24.8},b);
  assert.equal(s.units.find(u=>u.id===900).order,'Skirmish');assert.equal(s.units.find(u=>u.id===901).order,'Skirmish');
});
test('explicit missile movement is respected, then resumes skirmishing on arrival',()=>{
  const b={...context(),walls:false,terrain:'Plains'},units=createBattle([roster('velites',1)],[roster('hastati',2)],false,false);
  units[0]={...units[0],x:15,y:50,tx:25,ty:50,order:'Move'};
  let moved=advanceBattle(units,.2,b);assert.equal(moved[0].order,'Move');assert.ok(moved[0].x>15);
  moved[0]={...moved[0],x:25,y:50};moved=advanceBattle(moved,.2,b);assert.equal(moved[0].order,'Skirmish');
});
test('missiles retreat from a nearby threat instead of closing into melee',()=>{
  const b={...context(),walls:false,terrain:'Plains'},u=createBattle([roster('velites',1)],[roster('hastati',2)],false,false);
  u[0]={...u[0],x:30,y:50};u[1]={...u[1],x:38,y:50,tx:38,ty:50,order:'Hold'};
  assert.ok(advanceBattle(u,.2,b)[0].x<30);
});
test('auto deployment screens missiles and places cavalry on a flank',()=>{
  const u=createBattle(['hastati','principes','velites','equites','triarii'].map((k,i)=>roster(k,i+1)),[],false,false);
  const screen=u.filter(x=>x.kind==='Infantry'||x.kind==='Spears'),missile=u.find(x=>x.kind==='Archers'),horse=u.find(x=>x.kind==='Cavalry');
  assert.ok(screen.every(x=>x.x>missile.x));assert.ok(horse.y<Math.min(...screen.map(x=>x.y))||horse.y>Math.max(...screen.map(x=>x.y)));
});
test('auto deployment stays bounded, non-overlapping, deterministic and non-mutating',()=>{
  for(const terrain of ['Plains','Hills','Forest','River'])for(const key of ['hastati','velites','equites']){
    const u=createBattle(Array.from({length:8},(_,i)=>roster(key,i+1)),[],false,false),before=structuredClone(u),next=autoDeploy(u,terrain);
    assert.deepEqual(u,before);assert.deepEqual(next,autoDeploy(u,terrain));
    for(const p of next)assert.ok(p.x>=8&&p.x<=34&&p.y>=11&&p.y<=89);
    for(let i=0;i<next.length;i++)for(let j=i+1;j<next.length;j++)assert.ok(Math.hypot(next[i].x-next[j].x,next[i].y-next[j].y)>5.2);
  }
});
test('auto placement considers hills and does not rearrange enemy troops on player request',()=>{
  const b=context(),next=autoDeploy(b.units,'Hills',true);
  assert.deepEqual(next.filter(u=>u.side==='carthage'),b.units.filter(u=>u.side==='carthage'));
  assert.ok(next.some(u=>u.side==='rome'&&battlefieldFeatureAt('Hills',u.x,u.y)==='Hill'));
});
test('fortified defenders start behind their wall in campaigns and the battle lab',()=>{
  for(const terrain of ['Plains','Hills','Forest','River']){
    const b=makeQuickBattle({theater:'italy',terrain,weather:'Clear',scenario:'Assault',player:['hastati','velites'],enemy:['hastati','velites','equites']}).context;
    assert.ok(b.units.filter(u=>u.side==='carthage').every(u=>u.x>70));
  }
});
test('unit display numbers include reserves and survive arrival sorting',()=>{
  const b={...context(),reinforcements:[roster('velites',42)]},numbers=battleUnitNumbers(b);
  const s=tickBattle({...initialBattleSnapshot(b),phase:'fight',elapsed:24.8},b);
  assert.equal(numbers.get(42),b.units.filter(u=>u.side==='rome').length+1);
  assert.ok(s.units.every(u=>numbers.has(u.id)));
});
test('enemy badges expose name, type, count, number and inspection affordance',()=>{
  const u=createBattle([],[roster('velites',2)],false,false)[0];
  const html=renderToStaticMarkup(createElement(BattleUnitMarker,{unit:u,number:2,selected:false,inspected:true,onClick:noop,onInspect:noop}));
  for(const value of ['Enemy Velites I','Archers','80 soldiers','Inspect unit','token-badge','token-name'])assert.ok(html.includes(value));
});
test('enemy inspector renders stats and an explicit attack action rather than issuing an order',()=>{
  const b=context(),u=b.units.find(u=>u.side==='carthage');
  const html=renderToStaticMarkup(createElement(BattleInspector,{unit:u,context:b,canAttack:true,onAttack:noop,onClose:noop}));
  for(const value of ['ENEMY UNIT','Soldiers','Morale','Fatigue','Attack target with selected units'])assert.ok(html.includes(value));
});
test('final training content and its dismissal button are separate flow elements',async()=>{
  const html=renderToStaticMarkup(createElement(FieldTraining,{step:4,onSkip:noop}));
  assert.match(html,/Training complete/);assert.match(html,/<\/p><button[^>]*>Got it<\/button>/);
  const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(css,/\.tutorial button\{position:static/);assert.match(css,/\.tutorial p\{margin:0/);
  assert.match(css,/\.battle-layout>\.field-wrap\{height:auto/);
});
test('battle dialogs use a native top-layer dialog and opaque backdrop',async()=>{
  const html=renderToStaticMarkup(createElement(BattleDialog,{title:'Withdraw army'},'Leave the battlefield?'));
  assert.match(html,/<dialog[^>]*class="battle-dialog"/);
  const css=await readFile(new URL('../app/globals.css',import.meta.url),'utf8');assert.match(css,/\.battle-dialog::backdrop\{background:#11150ff2/);
});
test('Rome sea routes use namespaced classes and the same SVG coordinate space as markers',()=>{
  const html=renderToStaticMarkup(createElement(CampaignMap,{campaign:createCampaign('italy'),expanded:false,onExpand:noop,onCity:noop,onArmy:noop}));
  assert.match(html,/class="route-sea"/);assert.doesNotMatch(html,/<line[^>]*class="sea"/);
  assert.match(html,/preserveAspectRatio="none"/);assert.match(html,/viewBox="0 0 /);
  // Both routes out of Rome must begin at the actual settlement anchor, not its army token.
  const pin=html.match(/aria-label="Select Rome"[^>]*style="left:([\d.]+)px;top:([\d.]+)px/);
  assert.ok(pin);assert.ok(html.includes(`x1="${pin[1]}" y1="${pin[2]}"`));
});
