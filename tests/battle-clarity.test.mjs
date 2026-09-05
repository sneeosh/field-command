import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,makeRoster,makeEncounter} from '../lib/campaign-engine.ts';
import {createBattle,advanceBattle} from '../lib/battle-engine.ts';
import {commandAI} from '../lib/tactics.ts';
import {fallbackOrder,combatModifiers,pursuitEstimate,resolvePursuit,moraleState,canRally,rallyUnit,braced,chargeReady,reformUnit} from '../lib/battle-rules.ts';
import {orderFeedback,orderPath} from '../lib/battle-feedback.ts';
import {contentVersion} from '../lib/game-content.ts';
import {decodeSave} from '../lib/save-game.ts';
const roster=(key,id)=>makeRoster(key,id,1);
const context=()=>{const c=createCampaign('italy');return {...makeEncounter(c,c.armies[0],c.armies[1],c.cities[3],false),walls:false,terrain:'Plains',weather:'Clear',general:null};};
function pair(a='velites',b='hastati'){return createBattle([roster(a,1)],[roster(b,2)],false,false).map((u,i)=>({...u,x:i?70:30,y:50,tx:i?70:30,ty:50,order:i?'Hold':'Skirmish'}));}

for(const side of ['rome','carthage'])test(`${side} empty ammunition falls back and AI does not overwrite it`,()=>{
  const c=context(),u=pair().map(t=>({...t,side:t.side===side?'rome':'carthage'}));u[0].side=side;u[1].side=side==='rome'?'carthage':'rome';u[0].ammo=0;
  const old=structuredClone(u),next=advanceBattle(u,.2,c),unit=next.find(t=>t.id===1);
  assert.equal(unit.order,'Fallback');assert.ok(side==='rome'?unit.x<30:unit.x>30);assert.deepEqual(u,old);
  assert.equal(commandAI(next,c,2).find(t=>t.id===1).order,'Fallback');
});
for(const policy of ['Hold','Melee'])test(`empty ammunition honors ${policy} policy`,()=>{
  const u=pair();u[0].ammo=0;u[0].ammoPolicy=policy;
  assert.equal(advanceBattle(u,.2,context())[0].order,policy==='Melee'?'Attack':'Hold');
});
test('explicit empty-ammo attack still closes to melee',()=>{const u=pair();u[0].ammo=0;u[0].order='Attack';assert.ok(advanceBattle(u,.2,context())[0].x>u[0].x);});
test('enemy depleted missiles do not resume attacking after fallback ends',()=>{
  const u=pair();u[0]={...u[0],side:'carthage',ammo:0,order:'Hold'};u[1]={...u[1],side:'rome',x:50,tx:50};
  const next=advanceBattle(u,.2,context())[0];assert.equal(next.order,'Hold');assert.equal(next.x,u[0].x);
});
test('fallback keeps facing and uses a nearby friendly infantry screen',()=>{
  const u=pair(),screen={...u[1],id:3,side:'rome',x:25};const ordered=fallbackOrder(u[0],[...u,screen]);
  assert.equal(ordered.tx,13);assert.equal(ordered.lockedFacing,u[0].lockedFacing);
  const moved=advanceBattle([ordered,u[1],screen],.2,context())[0];assert.equal(moved.facing,u[0].facing);assert.ok(moved.x<30);
});
test('fallback does not leave automatic facing locked on subsequent moves',()=>{
  const u=pair(),ordered=fallbackOrder(u[0],u);
  const moved=advanceBattle([{...ordered,order:'Move',tx:30,ty:90},u[1]],.2,context())[0];assert.equal(moved.facing,90);assert.equal(moved.lockedFacing,null);
});
test('manual turning and reforming invalidate bracing and charge readiness',()=>{
  const u={...pair('triarii')[0],formation:'Guard',order:'Hold',steadySeconds:3,charging:true,chargeDistance:12};
  for(const patch of [{facing:180},{formation:'Line'},{width:'Wide'}]){const next=reformUnit(u,patch);assert.equal(braced(next),false);assert.equal(next.chargeDistance,0);assert.equal(next.charging,false);}
});
test('hold fire conserves ammunition but permits melee self-defense',()=>{
  const u=pair();u[0].holdFire=true;u[1]={...u[1],x:45,tx:45};const next=advanceBattle(u,.2,context());assert.equal(next[0].ammo,24);assert.equal(next[1].men,u[1].men);
  u[0].order='Hold';u[1]={...u[1],x:35,tx:35};assert.ok(advanceBattle(u,1,context())[0].damageDealt>0);
});
test('cohorts hold when their assigned target breaks unless pursuit is enabled',()=>{
  const u=pair('hastati');u[0]={...u[0],order:'Attack',attackTarget:2};u[1].morale=0;
  const other={...u[1],id:3,morale:90,y:30};assert.equal(advanceBattle([...u,other],.2,context())[0].order,'Hold');
  u[0].pursue=true;assert.equal(advanceBattle([...u,other],.2,context())[0].attackTarget,3);
});
test('bracing needs stationary guard spears and only protects their front',()=>{
  const u=pair('equites','triarii');u[1]={...u[1],formation:'Guard',steadySeconds:2,facing:180};u[0]={...u[0],charging:true,chargeDistance:9};
  assert.ok(braced(u[1]));assert.ok(chargeReady(u[0],context()));
  const factors=combatModifiers(u[0],u[1],context(),false);assert.equal(factors.find(m=>m.label==='Braced spear front').factor,.7);assert.equal(factors.find(m=>m.label==='Charge impact').factor,1);
  assert.equal(combatModifiers(u[0],{...u[1],facing:0},context(),false).find(m=>m.label==='Braced spear front').factor,1);
  assert.equal(braced({...u[1],steadySeconds:1}),false);assert.equal(braced({...u[1],order:'Move'}),false);
});
test('charges require run-up and cannot be triggered by toggling Charge in contact',()=>{
  const u=pair('equites');assert.equal(chargeReady({...u[0],charging:true},context()),false);assert.equal(chargeReady({...u[0],charging:true,chargeDistance:9,stamina:80},context()),false);
  const next=advanceBattle([{...u[0],order:'Charge',charging:true},u[1]],.2,context());assert.ok(next[0].chargeDistance>0&&next[0].chargeDistance<8);
});
test('morale states and rally limits explain weakening units without reviving routed troops',()=>{
  const u=pair('hastati');u[0].morale=40;assert.equal(moraleState(u[0]),'Wavering');assert.ok(canRally(u[0],u));
  const rallied=rallyUnit(u[0],u);assert.equal(rallied.morale,52);assert.equal(canRally(rallied,u),false);
  assert.equal(canRally({...u[0],morale:10},u),false);assert.equal(canRally(u[0],[u[0],{...u[1],x:35}]),false);
});
test('pursuit requires fresh cavalry and applies its exact preview without mutating inputs',()=>{
  const u=pair('equites');u[1].morale=0;const before=structuredClone(u),preview=pursuitEstimate(u),next=resolvePursuit(u);
  assert.ok(preview.caught>0&&preview.losses>0);assert.equal(u[1].men-next[1].men,preview.caught);assert.equal(u[0].men-next[0].men,preview.losses);assert.equal(next[0].stamina,20);assert.deepEqual(u,before);
  assert.equal(pursuitEstimate(pair('hastati')).caught,0);assert.equal(pursuitEstimate(u.map(t=>({...t,stamina:90}))).caught,0);
  assert.equal(pursuitEstimate(u.map(t=>({...t,morale:40}))).caught,0);
  assert.deepEqual(resolvePursuit([...u].reverse()).sort((a,b)=>a.id-b.id),next);
});
test('feedback distinguishes a blocked gate, a bridge waypoint, and a reloading volley',()=>{
  const u=pair();u[0]={...u[0],attackTarget:2,tx:90,order:'Attack'};
  assert.match(orderFeedback(u[0],u,{...context(),walls:true},{phase:'fight',gateHealth:100}),/Gate blocks/);
  const route=orderPath({...u[0],tx:80,ty:50},{...context(),terrain:'River'});assert.equal(route.length,4);assert.equal(route[1].y,71);assert.equal(route[2].x,60);assert.equal(route[2].y,71);
  u[1].x=45;u[0].cooldown=1;assert.match(orderFeedback(u[0],u,context(),{phase:'fight'}),/Reloading/);
});
test('new tactical policies round-trip and malformed optional state is rejected',()=>{
  const campaign=createCampaign('italy'),battle=context();battle.units[0]={...battle.units[0],order:'Fallback',ammoPolicy:'Hold',holdFire:true,chargeDistance:4};
  const save={campaign,battle,contentVersion};assert.doesNotThrow(()=>decodeSave(JSON.stringify(save),contentVersion));
  battle.units[0].ammoPolicy='teleport';assert.throws(()=>decodeSave(JSON.stringify(save),contentVersion),/policy/);
  battle.units[0].ammoPolicy='Fallback';battle.units[0].bracedHits=-1;assert.throws(()=>decodeSave(JSON.stringify(save),contentVersion),/counter/);
});
