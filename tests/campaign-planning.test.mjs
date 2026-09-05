import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,makeEncounter,makeRoster,applyBattle} from '../lib/campaign-engine.ts';
import {cityTerrain,defenseEstimate,planAttack} from '../lib/campaign-planning.ts';
import {theaterDefinitions,cityDefinitions,markdownDefaults,applyMarkdownOverrides,contentVersion,compatibleContentVersion} from '../lib/game-content.ts';
import {decodeSave} from '../lib/save-game.ts';
import {lessonArmies,lessonProgress,tacticalLessons} from '../lib/tactical-lessons.ts';
import {createBattle,advanceBattle} from '../lib/battle-engine.ts';
import {resolvePursuit} from '../lib/battle-rules.ts';

test('each city has stable terrain across campaign turns',()=>{
  for(const theater of theaterDefinitions){const c=createCampaign(theater.key),p=c.armies[0],e=c.armies[1];for(const city of c.cities){const a=makeEncounter(c,p,e,city,false);c.turn+=7;assert.equal(makeEncounter(c,p,e,city,false).terrain,a.terrain);assert.equal(a.terrain,cityTerrain(city.id));}}
});
test('terrain can be edited and invalid types fail atomically',()=>{
  const content={...markdownDefaults,cities:markdownDefaults.cities.replace('| Hills |','| Forest |')};
  try{applyMarkdownOverrides(content);assert.equal(cityTerrain(1),'Forest');assert.throws(()=>applyMarkdownOverrides({...content,cities:content.cities.replace('| Forest |','| Ocean |')}),/terrain/);assert.equal(cityTerrain(1),'Forest');}
  finally{applyMarkdownOverrides(markdownDefaults);}
});
test('missing terrain column in older custom tables defaults safely',()=>{
  const old={...markdownDefaults,cities:markdownDefaults.cities.split('\n').map(l=>l.startsWith('|')?l.slice(0,l.lastIndexOf('|',l.length-2)+1):l).join('\n')};
  try{applyMarkdownOverrides(old);assert.ok(cityDefinitions.every(c=>c.terrain==='Plains'));}
  finally{applyMarkdownOverrides(markdownDefaults);}
});
test('AI considers troops and refuses an overwhelmingly defended target',()=>{
  const c=createCampaign('italy'),a=c.armies.find(a=>a.side==='carthage');c.difficulty='Commander';const target=c.cities.find(x=>x.id===3);a.cityId=4;
  const before=defenseEstimate(c,target);target.garrison=Array.from({length:30},(_,i)=>makeRoster('hastati',50000+i,1));assert.ok(defenseEstimate(c,target)>before+3000);assert.notEqual(planAttack(c,a)?.id,target.id);
  a.supplies=10;assert.equal(planAttack(c,a),null);
});
test('road reinforcement armies count but marching armies do not',()=>{
  const c=createCampaign('italy'),city=c.cities.find(c=>c.id===2),army=c.armies[0];army.cityId=1;army.targetCityId=null;
  const ready=defenseEstimate(c,city);army.targetCityId=3;assert.ok(defenseEstimate(c,city)<ready);
});
test('previous stock saves and identical legacy custom rules migrate without accepting unrelated rules',()=>{
  const campaign=createCampaign('italy');for(const old of ['vt6q50',compatibleContentVersion])assert.equal(decodeSave(JSON.stringify({campaign,contentVersion:old}),contentVersion).contentVersion,contentVersion);
  assert.throws(()=>decodeSave(JSON.stringify({campaign,contentVersion:'unrelated'}),contentVersion),/different/);
});
test('matching custom legacy rules migrate, but not to an arbitrary fingerprint',()=>{
  try{applyMarkdownOverrides({...markdownDefaults,cities:markdownDefaults.cities.replace('| Hills |','| Forest |')});
    const raw=JSON.stringify({campaign:createCampaign('italy'),contentVersion:compatibleContentVersion});
    assert.equal(decodeSave(raw,contentVersion).contentVersion,contentVersion);
    assert.throws(()=>decodeSave(raw,'unrelated'),/different/);
  }finally{applyMarkdownOverrides(markdownDefaults);}
});
test('offensive victories let enemy survivors retreat and pursuit losses persist',()=>{
  const c=createCampaign('greece'),p=c.armies.find(a=>a.side==='rome'),e=c.armies.find(a=>a.side==='carthage'),city=c.cities.find(x=>x.id===104);
  p.cityId=city.id;e.cityId=city.id;p.units=[makeRoster('companions',p.units[0].id,1)];
  const battle=makeEncounter(c,p,e,city,false),survivors=battle.units.map(u=>({...u,morale:u.side==='rome'?90:0})),pursued=resolvePursuit(survivors);
  const before=applyBattle(c,battle,'VICTORY',survivors).campaign,after=applyBattle(c,battle,'VICTORY',pursued).campaign;
  const escaped=after.armies.find(a=>a.id===e.id);assert.ok(escaped);assert.notEqual(escaped.cityId,city.id);assert.equal(after.cities.find(x=>x.id===escaped.cityId).owner,'carthage');
  assert.ok(after.armies.find(a=>a.id===p.id).units[0].men<before.armies.find(a=>a.id===p.id).units[0].men);
  assert.ok(after.armies.filter(a=>a.side==='carthage').flatMap(a=>a.units).reduce((n,u)=>n+u.men,0)<before.armies.filter(a=>a.side==='carthage').flatMap(a=>a.units).reduce((n,u)=>n+u.men,0));
});
test('all three lessons have valid theater-specific armies',()=>{
  for(const t of theaterDefinitions)for(const l of tacticalLessons){const armies=lessonArmies(t.key,l.key);assert.ok(armies?.player.length&&armies?.enemy.length);const units=createBattle(armies.player.map((k,i)=>makeRoster(k,i+1,1)),armies.enemy.map((k,i)=>makeRoster(k,i+100,1)),false,false);assert.equal(lessonProgress(l.key,units),false);}
});
test('bracing lesson completes from an actual frontal combat interaction',()=>{
  const c=createCampaign('italy'),context={...makeEncounter(c,c.armies[0],c.armies[1],c.cities[3],false),walls:false,terrain:'Plains'};
  const u=createBattle([makeRoster('triarii',1,1)],[makeRoster('equites',2,1)],false,false);
  u[0]={...u[0],x:40,y:50,tx:40,ty:50,order:'Hold',formation:'Guard',facing:0,steadySeconds:3};u[1]={...u[1],x:45,y:50,tx:40,ty:50,order:'Attack',facing:180};
  assert.equal(lessonProgress('brace',advanceBattle(u,.2,context)),true);
});
