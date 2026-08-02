export type VictoryPath = "Conquest"|"Dominion";
export type BattleObjective = "Rout"|"Hold"|"Breakthrough";
export type BattlefieldTerrain = "Plains"|"Hills"|"Forest"|"River";
export type BattlefieldFeature = "Open"|"Road"|"Hill"|"Forest"|"River"|"Bridge";

export type CampaignMilestoneInput = {
  victoryPath:VictoryPath;
  objectiveHeld:boolean;
  capitalHeld:boolean;
  influence:number;
  allies:number;
  turn:number;
  turnLimit:number;
  playerName:string;
};

export function campaignMilestone(input:CampaignMilestoneInput){
  if(!input.capitalHeld)return "YOUR CAPITAL HAS FALLEN";
  if(input.victoryPath==="Conquest"&&input.objectiveHeld)return `${input.playerName.toUpperCase()} VICTORY`;
  if(input.victoryPath==="Dominion"&&input.influence>=100&&input.allies>=2)return "DIPLOMATIC DOMINION ACHIEVED";
  if(input.turn>input.turnLimit)return "THE CAMPAIGN MANDATE HAS EXPIRED";
  return null;
}

export function claimMandateReward(alreadyClaimed:boolean,objectiveHeld:boolean){
  return objectiveHeld&&!alreadyClaimed;
}

export function splitSupplies(total:number):[number,number]{
  const safe=Math.max(0,Math.min(100,Math.round(total)));
  return [Math.ceil(safe/2),Math.floor(safe/2)];
}

export function battleObjective(defensive:boolean,walls:boolean):BattleObjective{
  return defensive?"Hold":walls?"Breakthrough":"Rout";
}

export function hasExitedBattlefield(side:"rome"|"carthage",x:number){
  return side==="rome"?x<=0:x>=100;
}

export function shouldSkirmish(ammo:number,targetDistance:number){
  return ammo>0&&targetDistance<12;
}

export function deterministicIndex(seed:number,length:number){
  if(length<=0)return 0;
  const mixed=Math.imul(seed^0x9e3779b9,2654435761)>>>0;
  return mixed%length;
}

function insideEllipse(x:number,y:number,cx:number,cy:number,rx:number,ry:number){
  return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
}

/** Returns the tactical feature under a unit using the same percentage geometry as the field UI. */
export function battlefieldFeatureAt(terrain:BattlefieldTerrain,x:number,y:number):BattlefieldFeature{
  if(terrain==="River"&&x>=45&&x<=57)return y>=20&&y<=34||y>=64&&y<=78?"Bridge":"River";
  if(terrain==="Hills"&&(insideEllipse(x,y,30,25,24,17)||insideEllipse(x,y,67,72,26,18)))return "Hill";
  if(terrain==="Forest"&&(insideEllipse(x,y,31,68,18,25)||insideEllipse(x,y,65,27,18,22)))return "Forest";
  if(y>=76&&y<=86)return "Road";
  return "Open";
}
