import { formationAttack, formationDefense, matchup, moraleRule, terrainRule, unitDefinition } from './game-content.ts';
import { battlefieldFeatureAt } from './simulation-engine.ts';
import { attackAspect } from './tactics.ts';
import type { BattleContext, BattleUnit } from './game-types.ts';

export const separation=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
export const commandable=(u:BattleUnit)=>u.men>0&&!u.withdrawn&&u.morale>=moraleRule('rout_threshold');
export const groundAt=(u:{x:number;y:number},c:BattleContext)=>terrainRule(battlefieldFeatureAt(c.terrain,u.x,u.y));
export function missileRange(a:BattleUnit,b:BattleUnit,c:BattleContext){
  const stats=unitDefinition(a.key)!;
  return a.kind==='Archers'&&a.ammo>0?Math.max(6.4,stats.range*(c.weather==='Fog'?.72:1)*groundAt(b,c).visibility):a.kind==='Archers'?6.4:stats.range;
}
export function moraleState(u:BattleUnit){
  const threshold=moraleRule('rout_threshold');
  if(!u.men)return 'Destroyed';
  if(u.withdrawn)return 'Withdrawn';
  if(u.morale<threshold)return 'Routing';
  if(u.morale<threshold+15)return 'Breaking';
  if(u.morale<threshold+35)return 'Wavering';
  return 'Steady';
}
export function braced(u:BattleUnit){return u.kind==='Spears'&&u.formation==='Guard'&&u.order==='Hold'&&(u.steadySeconds??0)>=2;}
/** Re-forming or manually turning breaks a brace and any accumulated charge. */
export function reformUnit(u:BattleUnit,patch:Partial<Pick<BattleUnit,'facing'|'lockedFacing'|'formation'|'width'|'tx'|'ty'>>):BattleUnit{return {...u,...patch,steadySeconds:0,chargeDistance:0,charging:false};}
export function chargeReady(u:BattleUnit,c:BattleContext){return u.kind==='Cavalry'&&u.charging&&(u.chargeDistance??0)>=8&&u.stamina<70&&!['Forest','River','Bridge'].includes(groundAt(u,c).key);}

/** This list is consumed by BOTH the simulation and the UI. Values multiply outgoing damage. */
export function combatModifiers(u:BattleUnit,t:BattleUnit,c:BattleContext,missile:boolean){
  const ag=groundAt(u,c),tg=groundAt(t,c),aspect=attackAspect(u,t),trait=u.side==='rome'?c.general?.trait:undefined;
  const wallSide=c.defensive?'rome':'carthage',inWalls=c.defensive?t.x<35:t.x>70;
  const charge=!missile&&chargeReady(u,c),brace=!missile&&u.kind==='Cavalry'&&braced(t)&&aspect==='Front';
  return [
    {label:'Frontage',factor:missile?(u.width==='Wide'?1.08:u.width==='Narrow'?.92:1):(u.width==='Narrow'?1.06:u.width==='Wide'?.95:1)},
    {label:'Commander',factor:trait==='Bold'&&!missile?1.08:trait==='Cautious'?.97:1},
    {label:'Remaining strength',factor:u.men/u.maxMen},
    {label:'Unit matchup',factor:matchup(u.kind,t.kind)},
    {label:'Attacker formation',factor:formationAttack(u.formation)},
    {label:'Defender formation',factor:formationDefense(t.formation)},
    {label:aspect==='Rear'?'Rear attack':'Flank attack',factor:aspect==='Rear'?1.5:aspect==='Flank'?1.2:1},
    {label:'Charge impact',factor:charge&&!brace?1.35:1},
    {label:'Braced spear front',factor:brace?.7:1},
    {label:'Fatigue',factor:Math.max(.55,1-u.stamina/180)},
    {label:'Attacker terrain',factor:missile?ag.missile:ag.melee},
    {label:'Defender cover',factor:tg.incomingDamage},
    {label:'Rain',factor:missile&&c.weather==='Rain'?.76:1},
    {label:'Walls',factor:c.walls&&t.side===wallSide&&inWalls?.76:1},
    {label:'Experience',factor:1+u.experience*.08},
  ];
}

/** Fall back behind the closest intact infantry screen; never implicitly leave the battlefield. */
export function fallbackPosition(u:BattleUnit,units:BattleUnit[]){
  const screen=units.filter(t=>t.id!==u.id&&t.side===u.side&&commandable(t)&&['Infantry','Spears'].includes(t.kind))
    .sort((a,b)=>separation(u,a)-separation(u,b)||a.id-b.id)[0];
  const behind=u.side==='rome'?-1:1;
  return {x:Math.max(4,Math.min(96,screen?screen.x+behind*12:u.x+behind*14)),y:Math.max(5,Math.min(95,screen?.y??u.y))};
}
export function fallbackOrder(u:BattleUnit,units:BattleUnit[]):BattleUnit{
  const p=fallbackPosition(u,units);
  return {...u,order:'Fallback',tx:p.x,ty:p.y,attackTarget:null,aiWaypoint:null,charging:false,chargeDistance:0};
}
export function canRally(u:BattleUnit,units:BattleUnit[]){
  return commandable(u)&&!u.rallyUsed&&u.morale<70&&!units.some(t=>t.side!==u.side&&commandable(t)&&separation(u,t)<14);
}
export function rallyUnit(u:BattleUnit,units:BattleUnit[]):BattleUnit{
  return canRally(u,units)?{...u,morale:Math.min(70,u.morale+12),rallyUsed:true,moraleCauses:['Rallied away from the enemy (+12)'],moraleCauseSeconds:12}:u;
}

export function pursuitEstimate(units:BattleUnit[]){
  const pursuers=units.filter(u=>u.side==='rome'&&u.kind==='Cavalry'&&moraleState(u)==='Steady'&&u.order!=='Retreat'&&u.stamina<70);
  const targets=units.filter(u=>u.side==='carthage'&&u.men>0);
  const weight=pursuers.reduce((n,u)=>n+u.men*(1-u.stamina/100),0),survivors=targets.reduce((n,u)=>n+u.men,0);
  const caught=Math.min(Math.floor(survivors*.3),Math.floor(weight*.4));
  const losses=Math.min(Math.max(0,pursuers.reduce((n,u)=>n+u.men,0)-pursuers.length),Math.ceil(caught*.1));
  return {pursuers,caught,losses,reason:!pursuers.length?'No steady cavalry below 70% fatigue available.':!caught?'No enemy survivors can be caught.':`${caught} enemy casualties at the cost of ${losses} cavalry. Losses carry into the campaign.`};
}
/** Deterministic, bounded, and previewable. No free pursuit when cavalry are absent or exhausted. */
export function resolvePursuit(units:BattleUnit[]):BattleUnit[]{
  const estimate=pursuitEstimate(units);
  if(!estimate.caught)return units;
  let caught=estimate.caught,losses=estimate.losses;
  const eligible=new Set(estimate.pursuers.map(u=>u.id));
  const casualties=new Map<number,number>();
  for(const u of [...units].sort((a,b)=>a.id-b.id)){
    if(u.side==='carthage'){const n=Math.min(u.men,caught);caught-=n;casualties.set(u.id,n);}
    else if(eligible.has(u.id)){const n=Math.min(u.men-1,losses);losses-=n;casualties.set(u.id,n);}
  }
  return units.map(u=>({...u,men:u.men-(casualties.get(u.id)??0),stamina:eligible.has(u.id)?Math.min(100,u.stamina+20):u.stamina}));
}
