import assert from "node:assert/strict";
import test from "node:test";
import { createBattle, advanceBattle, tickBattle, battleResult, initialBattleSnapshot, deploymentPositions, effectiveRange, crossingWaypoint } from "../lib/battle-engine.ts";
import { createCampaign, makeRoster, makeEncounter, applyBattle, processTurn, sideUpkeep, transferCohorts, conductDiplomacy, evaluateCampaign, pendingEncounter } from "../lib/campaign-engine.ts";
import { markdownDefaults, applyMarkdownOverrides, contentVersion, unitDefinition, terrainRule, theaterDefinitions } from "../lib/game-content.ts";
import { decodeSave } from "../lib/save-game.ts";
import { layoutMap, clampPan } from "../lib/map-layout.ts";

const roster=(key,id)=>makeRoster(key,id,1);
function battle(terrain="Plains",defensive=false,walls=false){const c=createCampaign("italy"),p=c.armies.find(a=>a.side==="rome"),e=c.armies.find(a=>a.side==="carthage"),city=c.cities.find(x=>x.id===e.cityId);return {...makeEncounter(c,p,e,city,defensive),terrain,walls};}
function pair(a="hastati",b="hastati",c=battle()){
  return createBattle([roster(a,1)],[roster(b,2)],c.defensive,c.walls).map((u,i)=>({...u,x:i?55:50,y:50,tx:i?55:50,ty:50,order:"Hold",attackTarget:i?1:2}));
}

test("attacker closes to the same concealed missile range used by damage",()=>{
  const c=battle("Forest");let units=pair("velites","hastati",c);units[0]={...units[0],x:44,y:27,order:"Attack"};units[1]={...units[1],x:65,y:27,tx:65,ty:27,order:"Hold"};
  assert.ok(effectiveRange(units[0],units[1],c)<20);
  for(let i=0;i<100;i++)units=advanceBattle(units,.2,c);
  assert.ok(units[1].men<120,"forest target should take damage rather than trapping the attacker outside range");
});
test("concealment never reduces melee reach",()=>{const c=battle("Forest"),u=pair("hastati","hastati",c);u[1].x=65;u[1].y=27;assert.equal(effectiveRange(u[0],u[1],c),6.4);});
test("retreat ignores nearby targets and reaches the exit",()=>{
  const c=battle();let units=pair();units[0]={...units[0],x:8,order:"Retreat"};units[1]={...units[1],x:12};
  for(let i=0;i<100;i++)units=advanceBattle(units,.2,c);
  assert.equal(units[0].attackTarget,null);assert.equal(units[0].withdrawn,true);
});
test("routing AI cannot cancel its own retreat",()=>{const c=battle();let u=pair();u[1]={...u[1],morale:10,x:94,order:"Attack"};for(let i=0;i<80;i++)u=advanceBattle(u,.2,c);assert.equal(u[1].withdrawn,true);});
test("Move orders disengage and are not replaced by automatic attacks",()=>{const c=battle();let u=pair();u[0]={...u[0],order:"Move",attackTarget:null,tx:20};u=advanceBattle(u,.2,c);assert.ok(u[0].x<50);assert.equal(u[0].tx,20);});
test("damage accumulates fractions without a minimum one-casualty tax",()=>{const c=battle(),u=pair();u[0].men=1;const next=advanceBattle(u,.2,c);assert.equal(next[1].men,120);assert.ok(next[1].damageCarry>0&&next[1].damageCarry<1);assert.equal(u[1].damageCarry,0);});
test("simultaneous damage is independent of input array order",()=>{const c=battle(),u=pair();assert.deepEqual(advanceBattle(u,.2,c),advanceBattle([...u].reverse(),.2,c));});
test("archer volleys consume one round, depleted units fall back by default",()=>{const c=battle();let u=pair("velites","hastati",c);u[0].ammo=1;u[1].x=65;u[1].tx=65;u[0].order="Skirmish";u=advanceBattle(u,.2,c);assert.equal(u[0].ammo,0);u=advanceBattle(u,.2,c);assert.equal(u[0].order,"Fallback");assert.equal(effectiveRange(u[0],u[1],c),6.4);});
test("five simulation steps equal one displayed second",()=>{const c=battle();let s={...initialBattleSnapshot(c),phase:"fight"};for(let i=0;i<5;i++)s=tickBattle(s,c);assert.equal(s.elapsed,1);});
test("deployment is inert and bounds contain a full eight-cohort formation",()=>{const c=battle(),s=initialBattleSnapshot(c);assert.equal(tickBattle(s,c),s);for(const x of [-100,0,39,100])for(const y of [-100,0,93,200])for(const p of deploymentPositions(8,x,y)){assert.ok(p.x>=8&&p.x<=34);assert.ok(p.y>=11&&p.y<=89);}});
test("bridges offer a faster crossing and automatic pursuit takes the nearest bridge",()=>{const c=battle("River");assert.ok(terrainRule("Bridge").movement>terrainRule("River").movement);assert.deepEqual(crossingWaypoint({x:30,y:47},{x:75,y:50},c),{x:42,y:27});assert.deepEqual(crossingWaypoint({x:30,y:68},{x:75,y:70},c),{x:42,y:71});});
test("all reserves arrive once on both sides, including more than eight",()=>{
  const c=battle();c.reinforcements=Array.from({length:20},(_,i)=>roster("hastati",100+i));c.enemyReinforcements=Array.from({length:20},(_,i)=>roster("hastati",200+i));
  let s={...initialBattleSnapshot(c),phase:"fight",elapsed:45};s=tickBattle(s,c);
  for(const u of [...c.reinforcements,...c.enemyReinforcements])assert.equal(s.units.filter(x=>x.id===u.id).length,1);
  const n=s.units.length;s=tickBattle(s,c);assert.equal(s.units.length,n);assert.ok(s.units.every(u=>u.y>=5&&u.y<=95));
});
test("victory waits for enemy reserves",()=>{const c=battle();c.enemyReinforcements=[roster("hastati",900)];const s={...initialBattleSnapshot(c),phase:"fight"};s.units=s.units.map(u=>u.side==="carthage"?{...u,men:0}:u);assert.equal(battleResult(s,c),null);});
test("contested breakthrough resets continuous capture progress",()=>{const c=battle("Plains",false,true);const u=pair();u[0]={...u[0],x:90,tx:90};u[1]={...u[1],x:92,tx:92};const next=tickBattle({units:u,phase:"fight",elapsed:10,objectiveProgress:8},c);assert.equal(next.objectiveProgress,0);});
test("defenders cannot earn hold progress after abandoning the left zone",()=>{const c=battle("Plains",true);const u=pair();const next=tickBattle({units:u,phase:"fight",elapsed:10,objectiveProgress:8},c);assert.equal(next.objectiveProgress,8);});
test("defensive walls protect the player, not the attackers",()=>{const c=battle("Plains",true,true),u=pair();u[0].x=25;u[1].x=30;const w=advanceBattle(u,1,c),open=advanceBattle(u,1,{...c,walls:false});assert.ok(w[0].men>=open[0].men);assert.equal(w[1].men,open[1].men);});
test("selected transfers conserve men and forbid hostile-city storage",()=>{const c=createCampaign("italy"),a=c.armies[0],city=c.cities.find(x=>x.id===a.cityId),id=a.units[1].id;const next=transferCohorts(c,a.id,city.id,[id],"toGarrison");assert.equal(next.cities.find(x=>x.id===city.id).garrison[0].id,id);assert.ok(!next.armies[0].units.some(u=>u.id===id));assert.equal(c.armies[0].units.length,5);assert.equal(sideUpkeep(c,"rome"),sideUpkeep(next,"rome"));const hostile={...c,cities:c.cities.map(x=>({...x,owner:"carthage"}))};assert.equal(transferCohorts(hostile,a.id,city.id,[id],"toGarrison"),hostile);});
test("campaign resolution preserves enemy reserves on player withdrawal",()=>{const c=createCampaign("italy"),a=c.armies[0],enemy=c.armies.find(x=>x.side==="carthage"),city=c.cities.find(x=>x.id===enemy.cityId);enemy.units=Array.from({length:20},(_,i)=>roster("hastati",100000+i));a.cityId=city.id;const context=makeEncounter(c,a,enemy,city,false),resolved=applyBattle(c,context,"WITHDRAWAL",context.units).campaign;assert.equal(resolved.armies.find(x=>x.id===enemy.id).units.length,20);});
test("garrisons participate in defense and stay separate after victory",()=>{const c=createCampaign("italy"),a=c.armies[0],e=c.armies.find(x=>x.side==="carthage"),city=c.cities.find(x=>x.id===a.cityId);city.garrison=[roster("hastati",8888)];const b=makeEncounter(c,a,e,city,true);assert.ok([...b.units,...b.reinforcements].some(u=>u.id===8888));const next=applyBattle(c,b,"VICTORY",b.units).campaign;assert.ok(next.cities.find(x=>x.id===city.id).garrison.some(u=>u.id===8888));assert.ok(!next.armies[0].units.some(u=>u.id===8888));});
test("enemy debt never causes negative replenishment or population creation",()=>{const c=createCampaign("italy");c.enemyTreasury=-999999;const e=c.armies.find(a=>a.side==="carthage");e.units[0].men=20;const before=e.units[0].men;const next=processTurn(c).campaign;assert.ok(next.enemyTreasury>=0);assert.ok(next.armies.find(a=>a.id===e.id).units[0].men>=before);});
test("diplomatic agreements cannot be repeatedly farmed",()=>{const c=createCampaign("italy");c.powers[0].relation=80;let next=conductDiplomacy(c,c.powers[0].key,"alliance");assert.equal(next.powers[0].status,"Allied");assert.equal(conductDiplomacy(next,c.powers[0].key,"alliance"),next);assert.equal(conductDiplomacy(c,"invalid","gift"),c);});
test("victory rewards are evaluated once after an objective capture",()=>{const c=createCampaign("italy");c.cities.find(x=>x.id===4).owner="rome";const next=evaluateCampaign(c);assert.equal(next.mandateRewardClaimed,true);assert.equal(evaluateCampaign(next).treasury,next.treasury);assert.match(next.result,/VICTORY/);});
test("save round-trips include battle checkpoints; invalid saves are rejected",()=>{const c=createCampaign("italy"),b=battle(),s=initialBattleSnapshot(b);const data={contentVersion,campaign:c,battle:b,snapshot:s};assert.deepEqual(decodeSave(JSON.stringify(data),contentVersion),data);assert.throws(()=>decodeSave(JSON.stringify({...data,contentVersion:"old"}),contentVersion),/different/);c.armies[0].units[0].men=-10;assert.throws(()=>decodeSave(JSON.stringify(data),contentVersion),/cohort/);});
test("invalid editable rules fail atomically",()=>{const before=unitDefinition("hastati").cost;assert.throws(()=>applyMarkdownOverrides({...markdownDefaults,units:markdownDefaults.units.replace("120 | 700","120 | -700")}),/cost/);assert.equal(unitDefinition("hastati").cost,before);assert.throws(()=>applyMarkdownOverrides({...markdownDefaults,terrainRules:markdownDefaults.terrainRules.replace("0.38","0.00")}),/movement/);});
test("Greek army markers do not overlap after layout; zoom can always pan",()=>{const c=createCampaign("greece"),layout=layoutMap(c.cities,c.armies,900,818),tokens=[...layout.tokens.values()];for(let i=0;i<tokens.length;i++)for(let j=i+1;j<tokens.length;j++)assert.ok(Math.hypot(tokens[i].x-tokens[j].x,tokens[i].y-tokens[j].y)>=30);assert.deepEqual(clampPan({x:999,y:-999},1000,900,{x:600,y:500}),{x:260,y:-260});});

test("every theater completes a finite battle on all terrain types",()=>{
  for(const theater of theaterDefinitions)for(const terrain of ["Plains","Hills","Forest","River"]){
    const campaign=createCampaign(theater.key),p=campaign.armies.find(a=>a.side==="rome"),e=campaign.armies.find(a=>a.side==="carthage");
    const c={...makeEncounter(campaign,p,e,campaign.cities.find(x=>x.id===e.cityId),false),terrain,walls:false};
    let s={...initialBattleSnapshot(c),phase:"fight"};s.units=s.units.map(u=>({...u,order:"Attack"}));
    for(let i=0;i<3001&&!battleResult(s,c);i++)s=tickBattle(s,c);
    assert.ok(battleResult(s,c),`${theater.key}/${terrain} never ended`);
    assert.ok(s.elapsed<600,`${theater.key}/${terrain} stalled until the time limit`);
    assert.ok(s.units.every(u=>[u.x,u.y,u.men,u.morale,u.stamina].every(Number.isFinite)&&u.men>=0&&u.men<=u.maxMen));
  }
});
test("save validation rejects unsafe reserve and construction records",()=>{
  const data={contentVersion,campaign:createCampaign("italy"),battle:battle()};
  data.battle.enemyReinforcements=[{...roster("hastati",100),key:"missing"}];
  assert.throws(()=>decodeSave(JSON.stringify(data),contentVersion),/cohort/);
  delete data.battle;data.campaign.cities[0].construction={name:"missing",turns:1};
  assert.throws(()=>decodeSave(JSON.stringify(data),contentVersion),/construction/);
});
test("all theaters have valid portable campaign saves",()=>{
  for(const theater of theaterDefinitions){const campaign=createCampaign(theater.key);assert.equal(decodeSave(JSON.stringify({contentVersion,campaign}),contentVersion).campaign.theater,theater.key);}
});
test("pending encounters resolve without charging another campaign turn",()=>{
  const c=createCampaign("italy"),p=c.armies[0],enemy=c.armies.find(a=>a.side==="carthage");
  p.cityId=enemy.cityId;p.siegeTarget=null;const b=pendingEncounter(c);
  assert.equal(b.targetCityId,enemy.cityId);assert.equal(c.turn,1);
  p.siegeTarget=p.cityId;assert.equal(pendingEncounter(c),null);
});
