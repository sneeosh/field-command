import { unitDefinition, theaterDefinitions, buildingDefinitions } from "./game-content.ts";
import type { Campaign, BattleContext, BattleSnapshot, BattleReport } from "./game-types.ts";

export type SavedGame={contentVersion:string;campaign:Campaign;battle?:BattleContext|null;snapshot?:BattleSnapshot|null;report?:BattleReport|null;savedAt?:string};

export function validateCampaign(c:Campaign){
  if(!c||!theaterDefinitions.some(t=>t.key===c.theater)||!Array.isArray(c.cities)||!c.cities.length||!Array.isArray(c.armies)||!Array.isArray(c.powers)||!Array.isArray(c.log))throw new Error("The save does not contain a valid campaign.");
  for(const key of ["turn","treasury","enemyTreasury","year","influence","nextUnitId","nextArmyId"] as const)if(!Number.isFinite(c[key]))throw new Error(`Invalid save value: ${key}.`);
  if(!Number.isInteger(c.turn)||c.turn<1||!["Conquest","Dominion"].includes(c.victoryPath)||!["Spring","Summer","Autumn","Winter"].includes(c.season))throw new Error("Invalid campaign state.");
  const t=theaterDefinitions.find(t=>t.key===c.theater)!;
  if(!c.cities.some(city=>city.id===t.capitalCity)||!c.cities.some(city=>city.id===t.objectiveCity))throw new Error("The save is missing an objective settlement.");
  const cityIds=new Set(c.cities.map(city=>city.id)),armyIds=new Set(c.armies.map(army=>army.id));
  if(cityIds.size!==c.cities.length||armyIds.size!==c.armies.length)throw new Error("Duplicate settlements or armies in save.");
  for(const city of c.cities){if(!Array.isArray(city.garrison)||!Array.isArray(city.recruitment)||!Array.isArray(city.buildings)||![city.population,city.publicOrder,city.defense,city.x,city.y].every(Number.isFinite))throw new Error("Invalid settlement in save.");for(const q of city.recruitment)if(!unitDefinition(q.key)||!Number.isFinite(q.turns))throw new Error("Invalid recruitment queue.");}
  for(const a of c.armies)if(!cityIds.has(a.cityId)||!Array.isArray(a.units)||!Number.isFinite(a.supplies))throw new Error("Invalid army in save.");
  for(const city of c.cities)if(!["rome","carthage"].includes(city.owner)||!Number.isFinite(city.baseIncome)||city.construction&&(!buildingDefinitions.some(b=>b.name===city.construction!.name)||!Number.isFinite(city.construction.turns)))throw new Error("Invalid settlement construction or ownership.");
  for(const a of c.armies)if(!["rome","carthage"].includes(a.side)||a.targetCityId!==null&&!cityIds.has(a.targetCityId)||a.siegeTarget!==null&&!cityIds.has(a.siegeTarget))throw new Error("Invalid army destination.");
  const units=[...c.armies.flatMap(a=>a.units),...c.cities.flatMap(city=>city.garrison)];
  if(new Set(units.map(u=>u.id)).size!==units.length)throw new Error("Duplicate cohorts in save.");
  for(const u of units)if(!unitDefinition(u.key)||![u.men,u.maxMen,u.upkeep,u.id].every(Number.isFinite)||u.men<0||u.men>u.maxMen||u.maxMen<=0)throw new Error("Invalid cohort in save.");
  const queued=c.cities.flatMap(city=>city.recruitment),ids=[...units,...queued].map(u=>u.id);
  if(new Set(ids).size!==ids.length||ids.some(id=>!Number.isInteger(id)||id>=c.nextUnitId)||c.armies.some(a=>a.side==="rome"&&a.id>=c.nextArmyId))throw new Error("Invalid or duplicate save identifiers.");
}

export function decodeSave(raw:string,version:string):SavedGame{
  const saved=JSON.parse(raw) as SavedGame;
  if(saved.contentVersion!==version)throw new Error("This save uses different game rules. Restore its matching rules before loading it.");
  validateCampaign(saved.campaign);
  if(saved.battle){
    const b=saved.battle,s=saved.snapshot;
    if(!Array.isArray(b.units)||!Array.isArray(b.reinforcements)||!saved.campaign.cities.some(c=>c.id===b.targetCityId))throw new Error("Invalid saved battle.");
    if(!["Plains","Hills","Forest","River"].includes(b.terrain)||!["Clear","Rain","Fog","Heat"].includes(b.weather)||typeof b.defensive!=="boolean"||typeof b.walls!=="boolean"||b.enemyReinforcements!==undefined&&!Array.isArray(b.enemyReinforcements))throw new Error("Invalid saved battlefield.");
    if(s&&(!Array.isArray(s.units)||![s.elapsed,s.objectiveProgress].every(Number.isFinite)||!["deploy","fight"].includes(s.phase)))throw new Error("Invalid battle checkpoint.");
    for(const u of [...b.units,...(s?.units??[])])if(!unitDefinition(u.key)||![u.x,u.y,u.men,u.morale,u.tx,u.ty,u.ammo].every(Number.isFinite))throw new Error("Invalid battlefield cohort.");
    for(const list of [b.units,s?.units??[],b.reinforcements,b.enemyReinforcements??[]]){
      if(new Set(list.map(u=>u.id)).size!==list.length)throw new Error("Duplicate battlefield cohorts.");
      for(const u of list)if(!unitDefinition(u.key)||![u.id,u.men,u.maxMen,u.experience].every(Number.isFinite)||u.men<0||u.men>u.maxMen||u.maxMen<=0)throw new Error("Invalid battlefield cohort.");
    }
    for(const u of [...b.units,...(s?.units??[])])if(!["rome","carthage"].includes(u.side)||!["Line","Guard","Wedge"].includes(u.formation)||!["Move","Attack","Hold","Skirmish","Charge","Retreat"].includes(u.order)||![u.stamina,u.facing].every(Number.isFinite))throw new Error("Invalid battlefield orders.");
  }
  return saved;
}
