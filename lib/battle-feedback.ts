import { crossingWaypoint } from './battle-engine.ts';
import { braced, chargeReady, commandable, missileRange, separation } from './battle-rules.ts';
import type { BattleContext, BattleSnapshot, BattleUnit } from './game-types.ts';

export function orderPath(u:BattleUnit,c:BattleContext,gateHealth=0){
  let goal={x:u.tx,y:u.ty};
  const attacker=u.side===(c.defensive?'carthage':'rome'),wall=c.defensive?35:70;
  if(c.walls&&attacker&&gateHealth>0&&(c.defensive?u.x>wall&&goal.x<wall:u.x<wall&&goal.x>wall))goal={x:wall+(c.defensive?4:-4),y:50};
  const waypoint=['Move','Hold','Retreat'].includes(u.order)?goal:crossingWaypoint(u,goal,c);
  if(separation(waypoint,goal)>.1){
    const exit={x:goal.x>u.x?60:42,y:waypoint.y};
    return separation(waypoint,exit)>.1?[u,waypoint,exit,goal]:[u,waypoint,goal];
  }
  return [u,goal];
}
export function orderFeedback(u:BattleUnit,units:BattleUnit[],c:BattleContext,s:Pick<BattleSnapshot,'phase'|'gateHealth'>){
  if(!u.men)return 'Destroyed';
  if(u.withdrawn)return 'Withdrawn from the battlefield';
  if(!commandable(u))return 'Routing — orders unavailable';
  if(s.phase==='deploy')return 'Deployment — reposition inside your zone';
  if(u.order==='Retreat')return 'Leaving the battlefield';
  if(u.order==='Fallback')return 'Falling back behind the line, keeping facing';
  if(u.kind==='Archers'&&u.ammo===0&&u.order==='Hold')return 'Out of ammunition — holding; order Attack for melee';
  const target=units.find(t=>t.id===u.attackTarget&&commandable(t));
  const wall=c.defensive?35:70,attacker=u.side===(c.defensive?'carthage':'rome');
  if(c.walls&&(s.gateHealth??100)>0&&attacker&&((c.defensive?u.tx<wall:u.tx>wall)||target&&(c.defensive?target.x<wall:target.x>wall))){
    if(separation(u,{x:wall,y:50})<7&&!(u.kind==='Archers'&&u.ammo>0))return 'Assaulting the gate';
    if(!target||separation(u,target)>missileRange(u,target,c))return 'Gate blocks approach — moving to gate';
  }
  if(u.order==='Move')return separation(u,{x:u.tx,y:u.ty})>.5?'Moving to ordered position':'At ordered position';
  if(braced(u))return 'Braced — spear front resists cavalry charges';
  if(u.kind==='Spears'&&u.formation==='Guard'&&u.order==='Hold')return 'Bracing — hold still for 2 seconds';
  if(u.kind==='Archers'&&u.holdFire)return 'Hold fire — ammunition conserved; melee self-defense enabled';
  if(u.order==='Hold')return 'Holding position — engaging enemies within reach';
  if(!target)return 'Awaiting a target';
  const d=separation(u,target);
  if(u.order==='Skirmish'&&d<10)return 'Skirmishing — evading a nearby threat';
  if(d>missileRange(u,target,c))return chargeReady(u,c)?'Charge ready — closing on target':'Moving into range';
  if(u.kind==='Archers'&&u.ammo>0&&d>6.4)return (u.cooldown??0)>0?'Reloading for the next volley':'Firing at target';
  return 'Engaged in melee';
}
