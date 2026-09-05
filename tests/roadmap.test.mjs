import assert from "node:assert/strict";
import test from "node:test";
import { attackAspect, separateFormations, commandAI, formationRadius, battleAnalysis } from "../lib/tactics.ts";
import { createBattle, advanceBattle, initialBattleSnapshot, tickBattle, battleResult } from "../lib/battle-engine.ts";
import { createCampaign, makeEncounter, makeRoster, garrisonCommander, applyBattle, processTurn, conductDiplomacy, resolveDecision, evaluateCampaign } from "../lib/campaign-engine.ts";
import { supplyConnected, recruitmentCost } from "../lib/campaign-rules.ts";
import { theaterDefinitions, contentVersion, theaterRoutes } from "../lib/game-content.ts";
import { decodeSave } from "../lib/save-game.ts";
const roster=(key,id)=>makeRoster(key,id,1);
function context(theater="italy",defensive=false){const c=createCampaign(theater),p=c.armies[0],e=c.armies.find(a=>a.side==="carthage"),city=c.cities.find(x=>x.id===(defensive?p.cityId:e.cityId));return {campaign:c,player:p,enemy:e,city,b:makeEncounter(c,p,e,city,defensive)};}

test("formation facing distinguishes front, flank, and rear",()=>{const t={x:50,y:50,facing:0};assert.equal(attackAspect({x:60,y:50},t),"Front");assert.equal(attackAspect({x:50,y:60},t),"Flank");assert.equal(attackAspect({x:40,y:50},t),"Rear");});
test("overlapping formations separate deterministically and narrow footprints are smaller",()=>{const u=createBattle([roster("hastati",1),roster("hastati",2)],[],false,false).map(u=>({...u,x:20,y:50}));const next=separateFormations(u,true);assert.ok(Math.hypot(next[0].x-next[1].x,next[0].y-next[1].y)>=4.19);assert.deepEqual(next,separateFormations([...u].reverse(),true));assert.ok(formationRadius({...u[0],width:"Narrow"})<formationRadius({...u[0],width:"Wide"}));assert.equal(u[0].y,50);});
test("manual facing remains locked while moving",()=>{const {b}=context();const u=createBattle([roster("hastati",1)],[],false,false);u[0]={...u[0],tx:40,ty:40,lockedFacing:90,facing:90};const moved=advanceBattle(u,.2,{...b,walls:false});assert.equal(moved[0].facing,90);assert.notEqual(moved[0].x,u[0].x);});
test("commander AI protects missiles and preserves an early reserve without stat buffs",()=>{const {b}=context();const units=createBattle([roster("equites",1)],[roster("triarii",2),roster("velites",3),roster("hastati",4),roster("hastati",5),roster("hastati",6)],false,false);units[0]={...units[0],x:65,y:40};units[2]={...units[2],x:75,y:40};let planned=commandAI(units,{...b,walls:false,difficulty:"Veteran"},2);assert.equal(planned.find(u=>u.id===2).aiRole,"Protect missiles");for(const u of planned)assert.equal(u.men,units.find(p=>p.id===u.id).men);units[0].x=15;planned=commandAI(units,{...b,walls:false,difficulty:"Commander"},2);assert.equal(planned.find(u=>u.id===6).aiRole,"Reserve");assert.notEqual(commandAI(units,{...b,walls:false,difficulty:"Recruit"},2).find(u=>u.id===6).aiRole,"Reserve");});
test("closed siege gates block an ordered crossing and take measurable assault damage",()=>{const {b}=context();const c={...b,terrain:"Plains",walls:true,reinforcements:[],enemyReinforcements:[]};const units=createBattle([roster("hastati",1)],[roster("hastati",2)],false,true);units[0]={...units[0],x:66,y:50,tx:90,ty:50,order:"Move"};units[1]={...units[1],x:92,y:85,tx:92,ty:85,order:"Hold"};let s={units,elapsed:0,phase:"fight",objectiveProgress:0,gateHealth:100};for(let i=0;i<5;i++)s=tickBattle(s,c);assert.ok(s.units[0].x<=67);assert.ok(s.gateHealth<100);assert.ok(s.gateHealth>0);});
test("garrison-only encounter survives turn refresh and returns survivors to the city",()=>{const {campaign:c,enemy,city}=context("italy",true);city.garrison=[roster("hastati",9001)];c.armies=c.armies.filter(a=>a.side!=="rome");enemy.cityId=city.id;const b=makeEncounter(c,garrisonCommander(city),enemy,city,true);assert.equal(b.garrisonOnly,true);assert.ok(b.units.some(u=>u.id===9001));const result=applyBattle(c,b,"VICTORY",b.units).campaign;assert.equal(result.cities.find(x=>x.id===city.id).garrison[0].id,9001);assert.equal(result.armies.some(a=>a.id<0),false);});
test("supporting army casualties go back to that army without duplicating cohorts",()=>{const {campaign:c,player:p,enemy,city}=context();p.cityId=city.id;const helper={...structuredClone(p),id:20,units:[roster("hastati",9001)],supplies:80};c.armies.push(helper);c.nextArmyId=21;const b=makeEncounter(c,p,enemy,city,false);assert.ok(b.supportArmies.some(a=>a.armyId===20));const support=createBattle([helper.units[0]],[],false,false)[0];support.men=37;const result=applyBattle(c,b,"VICTORY",[...b.units,support]).campaign;assert.equal(result.armies.find(a=>a.id===20).units[0].men,37);assert.ok(!result.armies.find(a=>a.id===19).units.some(u=>u.id===9001));});
test("faction specialties have distinct editable recruitment prices",()=>{assert.equal(recruitmentCost("italy","rome","hastati"),595);assert.equal(recruitmentCost("greece","rome","pezhetairoi"),680);assert.equal(recruitmentCost("italy","rome","equites"),1100);});
test("enemy occupation cuts a friendly supply line",()=>{const c=createCampaign("italy");assert.equal(supplyConnected(c,2,"rome"),true);const e=c.armies.find(a=>a.side==="carthage");e.cityId=2;assert.equal(supplyConnected(c,2,"rome"),false);});
test("previous shipped campaign saves migrate without accepting arbitrary mismatched rules",()=>{const campaign=createCampaign("italy");assert.equal(decodeSave(JSON.stringify({contentVersion:"2gs0g7",campaign}),contentVersion).contentVersion,contentVersion);assert.throws(()=>decodeSave(JSON.stringify({contentVersion:"other",campaign}),contentVersion),/different/);});
test("battle report explains observed combat rather than inventing a cause",()=>{const {b}=context();const u=createBattle([roster("hastati",1)],[],false,false);u[0].flankHits=3;u[0].damageDealt=12;assert.match(battleAnalysis(u,b).join(" "),/3 flank\/rear attacks/);assert.match(battleAnalysis(u,b)[0],/12 casualties/);});

for(const theater of theaterDefinitions)for(const difficulty of ["Recruit","Commander","Veteran"])test(`${theater.key}: ${difficulty} full battle simulation stays finite`,()=>{
  const {b}=context(theater.key);const c={...b,difficulty,walls:false,terrain:"River"};let s={...initialBattleSnapshot(c),phase:"fight"};s.units=s.units.map(u=>({...u,order:"Attack"}));
  for(let tick=0;tick<3001&&!battleResult(s,c);tick++)s=tickBattle(s,c);
  assert.ok(battleResult(s,c));assert.ok(s.units.every(u=>Number.isFinite(u.men)&&u.men>=0&&u.men<=u.maxMen));
});

for(const theater of theaterDefinitions)test(`${theater.key}: diplomacy path is achievable through priced decisions`,()=>{
  let c=createCampaign(theater.key);c.victoryPath="Dominion";
  // A policy-level campaign test; battlefield outcomes are separately simulated above.
  for(let turn=0;turn<theater.turnLimit&&!c.result;turn++){
    for(const p of c.powers){if(p.status!=="Allied"){const action=p.relation>=65?"alliance":p.relation>=35&&p.status==="Neutral"?"trade":"gift";c=conductDiplomacy(c,p.key,action);}}
    if(c.decision)c=resolveDecision(c,c.treasury>=600?"left":"right");
    c=evaluateCampaign(c);if(c.result)break;
    const step=processTurn(c);c=step.campaign;if(step.encounter)c=applyBattle(c,step.encounter,"VICTORY",step.encounter.units).campaign;
  }
  assert.equal(c.result,"DIPLOMATIC DOMINION ACHIEVED");
});

for(const theater of theaterDefinitions)test(`${theater.key}: conquest campaign resolves marches, sieges, rewards, and saves`,()=>{
  let c=createCampaign(theater.key);const routes=theaterRoutes(theater.key);
  for(let turns=0;turns<theater.turnLimit&&!c.result;turns++){
    const p=c.armies.find(a=>a.side==="rome");assert.ok(p);
    const queue=[[p.cityId]],seen=new Set([p.cityId]);let path=[];
    while(queue.length){const q=queue.shift();if(q.at(-1)===theater.objectiveCity){path=q;break;}for(const r of routes){const n=r.from===q.at(-1)?r.to:r.to===q.at(-1)?r.from:null;if(n!==null&&!seen.has(n)){seen.add(n);queue.push([...q,n]);}}}
    if(path.length>1)p.targetCityId=path[1];
    if(c.decision)c=resolveDecision(c,"right");
    const step=processTurn(c);c=step.campaign;
    let b=step.encounter;const army=c.armies.find(a=>a.id===p.id);
    if(!b&&army?.siegeTarget){const city=c.cities.find(x=>x.id===army.siegeTarget),enemy=c.armies.find(a=>a.side==="carthage"&&a.cityId===city.id);b=makeEncounter(c,army,enemy??null,city,false);}
    // The campaign policy assumes tactical victories; battle behavior has separate end-to-end simulations.
    if(b)c=applyBattle(c,b,"VICTORY",b.units).campaign;
    assert.doesNotThrow(()=>decodeSave(JSON.stringify({contentVersion,campaign:c}),contentVersion));
  }
  assert.match(c.result??"",/VICTORY/);assert.equal(c.mandateRewardClaimed,true);
});

test("AI attacks an unaccompanied garrison through a playable encounter",()=>{
  const c=createCampaign("italy");c.turn=4;c.armies=c.armies.filter(a=>a.side==="carthage");
  const outcome=processTurn(c);assert.ok(outcome.encounter);assert.equal(outcome.encounter.garrisonOnly,true);
  assert.ok(outcome.encounter.units.some(u=>u.side==="rome"));
});
test("walled assaults can open a gate and reach a terminal result",()=>{
  const {b}=context();const c={...b,walls:true,terrain:"Plains",reinforcements:[],enemyReinforcements:[]};
  c.units=createBattle([roster("hastati",1),roster("principes",2),roster("triarii",3)],[roster("velites",4)],false,true).map(u=>({...u,order:"Attack"}));
  let s={...initialBattleSnapshot(c),phase:"fight"};
  for(let i=0;i<3001&&!battleResult(s,c);i++)s=tickBattle(s,c);
  assert.ok(battleResult(s,c));assert.ok(s.elapsed<600);assert.ok(s.gateHealth>=0&&s.gateHealth<=100);
});
