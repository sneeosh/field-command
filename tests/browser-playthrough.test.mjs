import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, makeEncounter, makeRoster, enemyRoster, processTurn, armyReadyToAttack, garrisonCommander, applyBattle } from '../lib/campaign-engine.ts';
import { createBattle, advanceBattle, tickBattle, initialBattleSnapshot } from '../lib/battle-engine.ts';
import { capitalWarning } from '../lib/campaign-warnings.ts';
import { decodeSave } from '../lib/save-game.ts';
import { markdownDefaults, applyMarkdownOverrides, contentVersion } from '../lib/game-content.ts';

test('capital warning accounts for planned departures, arrivals, and city garrisons',()=>{
  const c=createCampaign('italy');assert.equal(capitalWarning(c),null);
  c.armies[0].targetCityId=2;assert.match(capitalWarning(c),/Rome is exposed: 0 defenders/);
  c.cities[0].garrison=[makeRoster('hastati',9000,1),makeRoster('hastati',9001,2)];
  assert.equal(capitalWarning(c),null);
  c.cities[0].garrison=[];c.armies[0].cityId=2;c.armies[0].targetCityId=1;
  assert.equal(capitalWarning(c),null);
});
test('depleted enemy armies recover instead of repeatedly launching doomed counterattacks',()=>{
  const c=createCampaign('italy');c.turn=4;
  c.armies[0].cityId=3;
  c.armies.filter(a=>a.side==='carthage').forEach(a=>a.units.forEach(u=>u.men=1));
  assert.equal(armyReadyToAttack(c.armies[1]),false);
  assert.equal(processTurn(c).encounter,null);
  c.armies[1].units.forEach(u=>u.men=u.maxMen);
  assert.equal(armyReadyToAttack(c.armies[1]),true);
});
test('routing and retreating cavalry discard flanking waypoints and exit',()=>{
  const c=createCampaign('italy'),b={...makeEncounter(c,c.armies[0],c.armies[1],c.cities[3],false),terrain:'Plains',walls:false};
  for(const change of [{morale:10},{order:'Retreat'}]){
    let units=createBattle([],[makeRoster('equites',1,1)],false,false).map(u=>({...u,x:75,y:50,aiWaypoint:{x:60,y:30},...change}));
    for(let i=0;i<1500&&!units[0].withdrawn;i++)units=advanceBattle(units,.2,b);
    assert.equal(units[0].withdrawn,true);assert.equal(units[0].aiWaypoint,undefined);
  }
});
test('accepted large city identifiers still produce unique, reloadable campaign cohorts',()=>{
  const modified={...markdownDefaults,cities:markdownDefaults.cities.replace(/\|\s*5\s*\|\s*italy\s*\|/, '| 500 | italy |'),routes:markdownDefaults.routes.replace(/(\|\s*italy\s*\|\s*1\s*\|)\s*5\s*\|/,'$1 500 |')};
  try{
    applyMarkdownOverrides(modified);
    const c=createCampaign('italy');assert.ok(c.cities.some(x=>x.id===500));
    assert.doesNotThrow(()=>decodeSave(JSON.stringify({contentVersion,campaign:c}),contentVersion));
  }finally{applyMarkdownOverrides(markdownDefaults);}
});
test('generated defenders cannot collide with an adjacent supporting army',()=>{
  const c=createCampaign('greece'),city=c.cities.find(x=>x.owner==='carthage'),player=c.armies[0];
  player.cityId=city.id;
  const enemy=c.armies.find(a=>a.cityId===city.id&&a.side==='carthage');
  enemy.units=enemyRoster(city.id,city.enemyPower,c.theater);
  // It is a supporting army, not the main defender; both used the same city-derived IDs before.
  const b=makeEncounter(c,player,null,city,false),ids=[...b.units,...b.reinforcements,...b.enemyReinforcements].map(u=>u.id);
  assert.equal(new Set(ids).size,ids.length);
  let s={...initialBattleSnapshot(b),phase:'fight',elapsed:50};s=tickBattle(s,b);
  assert.ok(b.enemyReinforcements.every(u=>s.units.some(x=>x.id===u.id)));
});
test('save validation rejects negative upkeep and cross-list duplicate reserves',()=>{
  const c=createCampaign('italy'),b=makeEncounter(c,c.armies[0],c.armies[1],c.cities[3],false);
  c.armies[0].units[0].upkeep=-1;
  assert.throws(()=>decodeSave(JSON.stringify({contentVersion,campaign:c}),contentVersion),/cohort/);
  c.armies[0].units[0].upkeep=90;b.reinforcements.push({...b.units[0]});
  assert.throws(()=>decodeSave(JSON.stringify({contentVersion,campaign:c,battle:b}),contentVersion),/Duplicate deployed/);
});
test('garrison-only victory does not claim a nonexistent commander earned honors',()=>{
  const c=createCampaign('italy'),city=c.cities[0];city.garrison=[makeRoster('hastati',9000,1)];c.armies=c.armies.filter(a=>a.side!=='rome');
  const b=makeEncounter(c,garrisonCommander(city),c.armies[0],city,true);
  assert.match(applyBattle(c,b,'VICTORY',b.units).notice,/garrison held/);
  assert.doesNotMatch(applyBattle(c,b,'VICTORY',b.units).notice,/earns new honors/);
});
