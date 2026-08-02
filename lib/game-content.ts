import unitsMarkdown from "../game-data/units.md?raw";
import buildingsMarkdown from "../game-data/buildings.md?raw";
import citiesMarkdown from "../game-data/cities.md?raw";
import bonusesMarkdown from "../game-data/combat-bonuses.md?raw";
import theatersMarkdown from "../game-data/theaters.md?raw";
import factionsMarkdown from "../game-data/factions.md?raw";
import routesMarkdown from "../game-data/routes.md?raw";

export type Side="rome"|"carthage";
export type Formation="Line"|"Guard"|"Wedge";
export type Kind="Infantry"|"Spears"|"Cavalry"|"Archers";
export type BuildingName="Forum"|"Barracks"|"Market"|"Stables"|"Walls";
export type MarkdownKey="units"|"buildings"|"cities"|"combatBonuses"|"theaters"|"factions"|"routes";
export type MarkdownContent=Record<MarkdownKey,string>;
export type UnitDefinition={key:string;theater:string;name:string;kind:Kind;men:number;cost:number;upkeep:number;requires:BuildingName|null;recruitable:boolean;starter:boolean;morale:number;attack:number;range:number;speed:number;note:string};
export type BuildingDefinition={name:BuildingName;cost:number;income:number;defense:number;icon:string;note:string};
export type CityDefinition={id:number;theater:string;name:string;region:string;owner:Side;population:number;baseIncome:number;defense:number;enemyPower:number;x:number;y:number;buildings:BuildingName[];army:string[]};
export type CombatRule={rule:"matchup"|"formation_attack"|"formation_defense"|"morale";subject:string;target:string;multiplier:number;note:string};
export type TheaterDefinition={key:string;name:string;subtitle:string;map:string;aspect:number;playerFaction:string;enemyFaction:string;capitalCity:number;objectiveCity:number;turnLimit:number;startYear:number;treasury:number;enemyTreasury:number;reward:number;description:string};
export type FactionDefinition={key:string;theater:string;side:Side;name:string;short:string;icon:string;personality:string;color:string;accent:string};
export type RouteDefinition={theater:string;from:number;to:number;type:"road"|"sea"};
type Row=Record<string,string>;
type Bundle={units:UnitDefinition[];buildings:BuildingDefinition[];cities:CityDefinition[];rules:CombatRule[];theaters:TheaterDefinition[];factions:FactionDefinition[];routes:RouteDefinition[];version:string};

export const markdownDefaults:MarkdownContent={units:unitsMarkdown,buildings:buildingsMarkdown,cities:citiesMarkdown,combatBonuses:bonusesMarkdown,theaters:theatersMarkdown,factions:factionsMarkdown,routes:routesMarkdown};
export const markdownLabels:Record<MarkdownKey,string>={units:"Units",buildings:"Buildings",cities:"Cities",combatBonuses:"Combat Bonuses",theaters:"Theaters",factions:"Factions",routes:"Routes"};

function parse(markdown:string,source:string):Row[]{
  const lines=markdown.split(/\r?\n/).map((line)=>line.trim()).filter((line)=>line.startsWith("|")&&line.endsWith("|"));
  if(lines.length<3)throw new Error(`${source}: expected a Markdown table.`);
  const cells=(line:string)=>line.slice(1,-1).split("|").map((value)=>value.trim()),heads=cells(lines[0]);
  return lines.slice(2).map((line,index)=>{const values=cells(line);if(values.length!==heads.length)throw new Error(`${source}: row ${index+1} has ${values.length} columns; expected ${heads.length}.`);return Object.fromEntries(heads.map((head,column)=>[head,values[column]]))});
}
function num(row:Row,key:string,source:string){const value=Number(row[key]);if(!Number.isFinite(value))throw new Error(`${source}: '${row[key]}' is not a valid ${key}.`);return value}
function one<T extends string>(value:string,choices:readonly T[],source:string,field:string):T{if(!choices.includes(value as T))throw new Error(`${source}: '${value}' is not a valid ${field}.`);return value as T}
function list(value:string){return value.toLowerCase()==="none"?[]:value.split(",").map((item)=>item.trim()).filter(Boolean)}
function yes(value:string){return value.toLowerCase()==="yes"}
function fingerprint(content:MarkdownContent){const all="imperium-engine-v5\n"+Object.values(content).join("\n");return Array.from(all).reduce((hash,character)=>Math.imul(hash^character.charCodeAt(0),16777619),2166136261).toString(36)}

const kinds=["Infantry","Spears","Cavalry","Archers"] as const,buildingNames=["Forum","Barracks","Market","Stables","Walls"] as const,sides=["rome","carthage"] as const;

function compile(content:MarkdownContent):Bundle{
  const units:UnitDefinition[]=parse(content.units,"units.md").map((r)=>({key:r.key,theater:r.theater,name:r.name,kind:one(r.kind,kinds,"units.md","kind"),men:num(r,"men","units.md"),cost:num(r,"cost","units.md"),upkeep:num(r,"upkeep","units.md"),requires:r.requires.toLowerCase()==="none"?null:one(r.requires,buildingNames,"units.md","requirement"),recruitable:yes(r.recruitable),starter:yes(r.starter),morale:num(r,"morale","units.md"),attack:num(r,"attack","units.md"),range:num(r,"range","units.md"),speed:num(r,"speed","units.md"),note:r.note}));
  const buildings:BuildingDefinition[]=parse(content.buildings,"buildings.md").map((r)=>({name:one(r.name,buildingNames,"buildings.md","name"),cost:num(r,"cost","buildings.md"),income:num(r,"income","buildings.md"),defense:num(r,"defense","buildings.md"),icon:r.icon,note:r.note}));
  const cities:CityDefinition[]=parse(content.cities,"cities.md").map((r)=>({id:num(r,"id","cities.md"),theater:r.theater,name:r.name,region:r.region,owner:one(r.owner,sides,"cities.md","owner"),population:num(r,"population","cities.md"),baseIncome:num(r,"baseIncome","cities.md"),defense:num(r,"defense","cities.md"),enemyPower:num(r,"enemyPower","cities.md"),x:num(r,"x","cities.md"),y:num(r,"y","cities.md"),buildings:list(r.buildings).map((name)=>one(name,buildingNames,"cities.md","building")),army:list(r.army)}));
  const rules:CombatRule[]=parse(content.combatBonuses,"combat-bonuses.md").map((r)=>({rule:one(r.rule,["matchup","formation_attack","formation_defense","morale"] as const,"combat-bonuses.md","rule"),subject:r.subject,target:r.target,multiplier:num(r,"multiplier","combat-bonuses.md"),note:r.note}));
  const theaters:TheaterDefinition[]=parse(content.theaters,"theaters.md").map((r)=>({key:r.key,name:r.name,subtitle:r.subtitle,map:r.map,aspect:num(r,"aspect","theaters.md"),playerFaction:r.playerFaction,enemyFaction:r.enemyFaction,capitalCity:num(r,"capitalCity","theaters.md"),objectiveCity:num(r,"objectiveCity","theaters.md"),turnLimit:num(r,"turnLimit","theaters.md"),startYear:num(r,"startYear","theaters.md"),treasury:num(r,"treasury","theaters.md"),enemyTreasury:num(r,"enemyTreasury","theaters.md"),reward:num(r,"reward","theaters.md"),description:r.description}));
  const factions:FactionDefinition[]=parse(content.factions,"factions.md").map((r)=>({key:r.key,theater:r.theater,side:one(r.side,sides,"factions.md","side"),name:r.name,short:r.short,icon:r.icon,personality:r.personality,color:r.color,accent:r.accent}));
  const routes:RouteDefinition[]=parse(content.routes,"routes.md").map((r)=>({theater:r.theater,from:num(r,"from","routes.md"),to:num(r,"to","routes.md"),type:one(r.type,["road","sea"] as const,"routes.md","type")}));
  validate({units,buildings,cities,rules,theaters,factions,routes,version:""});
  return{units,buildings,cities,rules,theaters,factions,routes,version:fingerprint(content)};
}

function validate(bundle:Bundle){
  const {units,cities,theaters,factions,routes}=bundle,unitKeys=new Set(units.map((unit)=>unit.key)),cityIds=new Set(cities.map((city)=>city.id)),factionKeys=new Set(factions.map((faction)=>faction.key)),theaterKeys=new Set(theaters.map((theater)=>theater.key));
  if(unitKeys.size!==units.length)throw new Error("units.md: unit keys must be unique.");
  if(cityIds.size!==cities.length)throw new Error("cities.md: city ids must be unique.");
  if(factionKeys.size!==factions.length)throw new Error("factions.md: faction keys must be unique.");
  if(theaterKeys.size!==theaters.length)throw new Error("theaters.md: theater keys must be unique.");
  for(const city of cities)for(const key of city.army){const unit=units.find((candidate)=>candidate.key===key);if(!unit)throw new Error(`cities.md: ${city.name} references unknown unit '${key}'.`);if(unit.theater!==city.theater)throw new Error(`cities.md: ${city.name} cannot use '${key}' from theater '${unit.theater}'.`)}
  for(const route of routes){const from=cities.find((city)=>city.id===route.from),to=cities.find((city)=>city.id===route.to);if(!from||!to)throw new Error(`routes.md: unknown city in ${route.from} → ${route.to}.`);if(from.theater!==route.theater||to.theater!==route.theater)throw new Error(`routes.md: ${route.from} → ${route.to} crosses theater boundaries.`)}
  for(const theater of theaters){const player=factions.find((faction)=>faction.key===theater.playerFaction),enemy=factions.find((faction)=>faction.key===theater.enemyFaction),capital=cities.find((city)=>city.id===theater.capitalCity),objective=cities.find((city)=>city.id===theater.objectiveCity),theaterRoutes=routes.filter((route)=>route.theater===theater.key),theaterCities=cities.filter((city)=>city.theater===theater.key);if(!player||!enemy)throw new Error(`theaters.md: ${theater.key} references an unknown faction.`);if(player.theater!==theater.key||player.side!=="rome"||enemy.theater!==theater.key||enemy.side!=="carthage")throw new Error(`theaters.md: ${theater.key} factions must match the theater and player/enemy sides.`);if(!capital||!objective||capital.theater!==theater.key||objective.theater!==theater.key)throw new Error(`theaters.md: ${theater.key} references a city outside its theater.`);if(!units.some((unit)=>unit.theater===theater.key)||!theaterRoutes.length)throw new Error(`theaters.md: ${theater.key} needs at least one unit and route.`);const reachable=new Set<number>([capital.id]),frontier=[capital.id];while(frontier.length){const id=frontier.pop()!;for(const route of theaterRoutes){const next=route.from===id?route.to:route.to===id?route.from:null;if(next!==null&&!reachable.has(next)){reachable.add(next);frontier.push(next)}}}if(theaterCities.some((city)=>!reachable.has(city.id)))throw new Error(`routes.md: every ${theater.key} city must be reachable from ${capital.name}.`)}
}

const initial=compile(markdownDefaults);
export const unitDefinitions=initial.units,buildingDefinitions=initial.buildings,cityDefinitions=initial.cities,combatRules=initial.rules,theaterDefinitions=initial.theaters,factionDefinitions=initial.factions,routeDefinitions=initial.routes;
export let contentVersion=initial.version;

export function applyMarkdownOverrides(content:MarkdownContent){const next=compile(content);unitDefinitions.splice(0,unitDefinitions.length,...next.units);buildingDefinitions.splice(0,buildingDefinitions.length,...next.buildings);cityDefinitions.splice(0,cityDefinitions.length,...next.cities);combatRules.splice(0,combatRules.length,...next.rules);theaterDefinitions.splice(0,theaterDefinitions.length,...next.theaters);factionDefinitions.splice(0,factionDefinitions.length,...next.factions);routeDefinitions.splice(0,routeDefinitions.length,...next.routes);contentVersion=next.version;return next.version}
export function matchup(a:Kind,t:Kind){return combatRules.find((rule)=>rule.rule==="matchup"&&rule.subject===a&&rule.target===t)?.multiplier??1}
export function formationAttack(f:Formation){return combatRules.find((rule)=>rule.rule==="formation_attack"&&rule.subject===f)?.multiplier??1}
export function formationDefense(f:Formation){return combatRules.find((rule)=>rule.rule==="formation_defense"&&rule.subject===f)?.multiplier??1}
export function moraleRule(subject:"casualty"|"surrounded"|"rout_threshold"){return combatRules.find((rule)=>rule.rule==="morale"&&rule.subject===subject)?.multiplier??(subject==="rout_threshold"?20:0)}
export function unitDefinition(key:string){return unitDefinitions.find((unit)=>unit.key===key||unit.name===key)}
export function theaterDefinition(key:string){return theaterDefinitions.find((theater)=>theater.key===key)??theaterDefinitions[0]}
export function factionDefinition(key:string){return factionDefinitions.find((faction)=>faction.key===key)??factionDefinitions[0]}
export function theaterRoutes(key:string){return routeDefinitions.filter((route)=>route.theater===key)}
