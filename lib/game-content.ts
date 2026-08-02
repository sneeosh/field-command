import unitsMarkdown from "../game-data/units.md?raw";
import buildingsMarkdown from "../game-data/buildings.md?raw";
import citiesMarkdown from "../game-data/cities.md?raw";
import bonusesMarkdown from "../game-data/combat-bonuses.md?raw";

export type Side = "rome" | "carthage";
export type Formation = "Line" | "Guard" | "Wedge";
export type Kind = "Infantry" | "Spears" | "Cavalry" | "Archers";
export type BuildingName = "Forum" | "Barracks" | "Market" | "Stables" | "Walls";
export type UnitDefinition = { key: string; name: string; kind: Kind; men: number; cost: number; upkeep: number; requires: BuildingName | null; recruitable: boolean; starter: boolean; morale: number; attack: number; range: number; speed: number; note: string };
export type BuildingDefinition = { name: BuildingName; cost: number; income: number; defense: number; icon: string; note: string };
export type CityDefinition = { id: number; name: string; region: string; owner: Side; population: number; baseIncome: number; defense: number; enemyPower: number; x: number; y: number; buildings: BuildingName[]; army: string[] };
export type CombatRule = { rule: "matchup" | "formation_attack" | "formation_defense" | "morale"; subject: string; target: string; multiplier: number; note: string };

type Row = Record<string, string>;

function parseTable(markdown: string, source: string): Row[] {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("|") && line.endsWith("|"));
  if (lines.length < 3) throw new Error(`${source}: expected a Markdown table with a header and at least one row.`);
  const cells = (line: string) => line.slice(1, -1).split("|").map((value) => value.trim());
  const headers = cells(lines[0]);
  return lines.slice(2).map((line, index) => {
    const values = cells(line);
    if (values.length !== headers.length) throw new Error(`${source}: row ${index + 1} has ${values.length} columns; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function number(row: Row, key: string, source: string) {
  const value = Number(row[key]);
  if (!Number.isFinite(value)) throw new Error(`${source}: '${row[key]}' is not a valid number for ${key}.`);
  return value;
}
function oneOf<T extends string>(value: string, choices: readonly T[], source: string, field: string): T {
  if (!choices.includes(value as T)) throw new Error(`${source}: '${value}' is not a valid ${field}. Choose ${choices.join(", ")}.`);
  return value as T;
}
function list(value: string) { return value.toLowerCase() === "none" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean); }
function yes(value: string) { return value.toLowerCase() === "yes"; }

const kinds = ["Infantry", "Spears", "Cavalry", "Archers"] as const;
const buildings = ["Forum", "Barracks", "Market", "Stables", "Walls"] as const;

export const unitDefinitions: UnitDefinition[] = parseTable(unitsMarkdown, "units.md").map((row) => ({
  key: row.key, name: row.name, kind: oneOf(row.kind, kinds, "units.md", "kind"), men: number(row,"men","units.md"), cost: number(row,"cost","units.md"), upkeep: number(row,"upkeep","units.md"),
  requires: row.requires.toLowerCase() === "none" ? null : oneOf(row.requires, buildings, "units.md", "building requirement"), recruitable: yes(row.recruitable), starter: yes(row.starter), morale: number(row,"morale","units.md"), attack: number(row,"attack","units.md"), range: number(row,"range","units.md"), speed: number(row,"speed","units.md"), note: row.note,
}));

export const buildingDefinitions: BuildingDefinition[] = parseTable(buildingsMarkdown, "buildings.md").map((row) => ({ name: oneOf(row.name, buildings, "buildings.md", "building name"), cost: number(row,"cost","buildings.md"), income: number(row,"income","buildings.md"), defense: number(row,"defense","buildings.md"), icon: row.icon, note: row.note }));

export const cityDefinitions: CityDefinition[] = parseTable(citiesMarkdown, "cities.md").map((row) => ({ id:number(row,"id","cities.md"), name:row.name, region:row.region, owner:oneOf(row.owner,["rome","carthage"] as const,"cities.md","owner"), population:number(row,"population","cities.md"), baseIncome:number(row,"baseIncome","cities.md"), defense:number(row,"defense","cities.md"), enemyPower:number(row,"enemyPower","cities.md"), x:number(row,"x","cities.md"), y:number(row,"y","cities.md"), buildings:list(row.buildings).map((name)=>oneOf(name,buildings,"cities.md","building")), army:list(row.army) }));

export const combatRules: CombatRule[] = parseTable(bonusesMarkdown, "combat-bonuses.md").map((row) => ({ rule:oneOf(row.rule,["matchup","formation_attack","formation_defense","morale"] as const,"combat-bonuses.md","rule"), subject:row.subject, target:row.target, multiplier:number(row,"multiplier","combat-bonuses.md"), note:row.note }));

const allContent = unitsMarkdown + buildingsMarkdown + citiesMarkdown + bonusesMarkdown;
export const contentVersion = Array.from(allContent).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261).toString(36);

const unitKeys = new Set(unitDefinitions.map((unit) => unit.key));
for (const city of cityDefinitions) for (const key of city.army) if (!unitKeys.has(key)) throw new Error(`cities.md: ${city.name} references unknown unit key '${key}'.`);

export function matchup(attacker: Kind, target: Kind) { return combatRules.find((rule) => rule.rule === "matchup" && rule.subject === attacker && rule.target === target)?.multiplier ?? 1; }
export function formationAttack(formation: Formation) { return combatRules.find((rule) => rule.rule === "formation_attack" && rule.subject === formation)?.multiplier ?? 1; }
export function formationDefense(formation: Formation) { return combatRules.find((rule) => rule.rule === "formation_defense" && rule.subject === formation)?.multiplier ?? 1; }
export function moraleRule(subject: "casualty" | "surrounded" | "rout_threshold") { return combatRules.find((rule) => rule.rule === "morale" && rule.subject === subject)?.multiplier ?? (subject === "rout_threshold" ? 20 : 0); }
export function unitDefinition(nameOrKey: string) { return unitDefinitions.find((unit) => unit.key === nameOrKey || unit.name === nameOrKey); }
