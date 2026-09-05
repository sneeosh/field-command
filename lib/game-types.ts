import type { Side, Formation, Kind, BuildingName } from "./game-content.ts";
import type { BattleObjective, BattlefieldTerrain } from "./simulation-engine.ts";

export type RosterUnit = { id:number; key:string; name:string; kind:Kind; men:number; maxMen:number; upkeep:number; experience:number };
export type QueueItem = { id:number; key:string; turns:number };
export type ArmyStance = "March"|"Fortify"|"Raid"|"Ambush";
export type BattleOrder = "Move"|"Attack"|"Hold"|"Skirmish"|"Charge"|"Retreat";
export type General = { name:string;trait:string;command:number;loyalty:number;victories:number };
export type MinorPower = { key:string;name:string;relation:number;status:"Neutral"|"Trade"|"Allied"|"Hostile" };
export type CampaignDecision = { id:string;title:string;text:string;left:string;right:string };
export type City = { id:number; name:string; region:string; owner:Side; population:number; baseIncome:number; defense:number; x:number; y:number; buildings:BuildingName[]; garrison:RosterUnit[]; recruitment:QueueItem[]; construction:{name:BuildingName;turns:number}|null;publicOrder:number;culture:number };
export type Army = { id:number; name:string; side:Side; cityId:number; targetCityId:number|null; movement:number; units:RosterUnit[];stance:ArmyStance;supplies:number;general:General|null;tradition:number;siegeTarget:number|null;siegeTurns:number };
export type Campaign = { theater:string;turn:number;year:number;season:string;treasury:number;enemyTreasury:number;influence:number;victoryPath:"Conquest"|"Dominion";mandateRewardClaimed:boolean;cities:City[];armies:Army[];powers:MinorPower[];decision:CampaignDecision|null;selectedCity:number;selectedArmy:number|null;log:string[];nextUnitId:number;nextArmyId:number;tutorial:number;result:string|null };
export type BattleUnit = RosterUnit & { side:Side; morale:number; stamina:number; ammo:number; x:number;y:number;tx:number;ty:number;facing:number;formation:Formation;attackTarget:number|null;charging:boolean;withdrawn:boolean;order:BattleOrder; damageCarry?:number; cooldown?:number; firedAt?:number|null; firedMissile?:boolean };
export type BattleContext = { units:BattleUnit[];reinforcements:RosterUnit[];enemyReinforcements?:RosterUnit[];playerGarrisonIds?:number[];enemyGarrisonIds?:number[];originCityId?:number;playerArmyId:number; enemyArmyId:number|null; targetCityId:number; defensive:boolean; walls:boolean;terrain:BattlefieldTerrain;weather:"Clear"|"Rain"|"Fog"|"Heat";season:string;general:General|null;stance:ArmyStance };
export type BattleOutcome = "VICTORY"|"DEFEAT"|"WITHDRAWAL";
export type BattleReport = {outcome:BattleOutcome;city:string;objective:BattleObjective;playerBefore:number;playerAfter:number;enemyBefore:number;enemyAfter:number;message:string;honors:string};

export type BattleSnapshot = { units:BattleUnit[]; elapsed:number; objectiveProgress:number; phase:"deploy"|"fight" };
