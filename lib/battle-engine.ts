import { attackAspect, separateFormations, commandAI } from "./tactics.ts";
import { autoDeploy } from "./deployment.ts";
import { unitDefinition, factionDefinition, moraleRule, terrainRule } from "./game-content.ts";
import { missileRange, combatModifiers, fallbackOrder } from './battle-rules.ts';
import { battlefieldFeatureAt, battleObjective, hasExitedBattlefield } from "./simulation-engine.ts";
import type { Side } from "./game-content.ts";
import type { ArmyStance, General, RosterUnit, BattleUnit, BattleContext, BattleSnapshot, BattleOutcome } from "./game-types.ts";

export const BATTLE_STEP = 0.2;
export const HOLD_SECONDS = 120;
export const BREACH_SECONDS = 12;
export const BATTLE_LIMIT = 600;
export const distance = (a:{x:number;y:number}, b:{x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (v:number,min:number,max:number) => Math.max(min,Math.min(max,v));
const active = (u:BattleUnit) => u.men>0&&!u.withdrawn&&u.morale>=moraleRule("rout_threshold");
const ground = (u:{x:number;y:number},c:BattleContext) => terrainRule(battlefieldFeatureAt(c.terrain,u.x,u.y));

export function effectiveRange(a:BattleUnit,b:BattleUnit,c:BattleContext){
  return missileRange(a,b,c);
}

export function deploymentPositions(count:number,x:number,y:number){
  const columns=Math.min(2,Math.ceil(count/4)),rows=Math.ceil(count/Math.max(1,columns));
  const centerX=clamp(x,8+(columns-1)*5,34-(columns-1)*5);
  const centerY=clamp(y,11+(rows-1)*6,89-(rows-1)*6);
  return Array.from({length:count},(_,i)=>({x:centerX+(i%columns-(columns-1)/2)*10,y:centerY+(Math.floor(i/columns)-(rows-1)/2)*12}));
}

export function createBattle(roman:RosterUnit[],punic:RosterUnit[],defensive:boolean,walls:boolean,general:General|null=null,tradition=0,stance:ArmyStance="March",supplies=100):BattleUnit[]{
  const make=(u:RosterUnit,i:number,side:Side):BattleUnit=>{
    const x=side==="rome"?15+(i%2)*14:72+(i%2)*14,y=22+Math.floor(i/2)*18;
    return {...u,side,morale:(unitDefinition(u.key)?.morale??90)+(side==="rome"?(general?.command??0)*.45+tradition*2+(stance==="Ambush"?6:0)-(supplies<25?12:0):0),stamina:0,ammo:u.kind==="Archers"?24:0,x,y,tx:x,ty:y,facing:side==="rome"?0:180,formation:u.kind==="Cavalry"?"Wedge":u.kind==="Spears"?"Guard":"Line",attackTarget:null,charging:false,withdrawn:false,order:u.kind==="Archers"?"Skirmish":side==="rome"?"Move":walls&&!defensive?"Hold":"Attack",cooldown:0,damageCarry:0,width:"Standard",lockedFacing:null};
  };
  return autoDeploy([...roman.slice(0,8).map((u,i)=>make(u,i,"rome")),...punic.slice(0,8).map((u,i)=>make(u,i,"carthage"))],"Plains",false,walls&&!defensive);
}

/** Automatic pursuit uses bridges. A direct ground Move order can deliberately ford. */
export function crossingWaypoint(u:{x:number;y:number},goal:{x:number;y:number},c:BattleContext){
  if(c.terrain!=="River")return goal;
  const direction=goal.x>u.x?1:-1;
  if(direction>0&&u.x>=60||direction<0&&u.x<=42||goal.x>=45&&goal.x<=57)return goal;
  if(!(Math.min(u.x,goal.x)<45&&Math.max(u.x,goal.x)>57)&&!(u.x>=42&&u.x<=60))return goal;
  const bridge=[27,71].sort((a,b)=>(Math.abs(u.y-a)+Math.abs(goal.y-a))-(Math.abs(u.y-b)+Math.abs(goal.y-b)))[0];
  const approach=direction>0?42:60,exit=direction>0?60:42;
  if(Math.abs(u.y-bridge)>2&&(direction>0?u.x<45:u.x>57))return {x:approach,y:bridge};
  return {x:exit,y:bridge};
}

export function advanceBattle(old:BattleUnit[],dt:number,c:BattleContext & {gateOpen?:boolean}):BattleUnit[]{
  // Sort for deterministic tie-breaking and read a single snapshot for every movement decision.
  const snapshot=[...old].sort((a,b)=>a.id-b.id);
  let next:BattleUnit[]=snapshot.map(previous=>{
    let u:BattleUnit={...previous,firedAt:null,firedMissile:false,cooldown:Math.max(0,(previous.cooldown??0)-dt),moraleCauseSeconds:Math.max(0,(previous.moraleCauseSeconds??0)-dt)};
    if(!u.moraleCauseSeconds)u.moraleCauses=[];
    if(!u.men||u.withdrawn)return u;
    const stats=unitDefinition(u.key)!;
    // Explicit ground movement finishes before restoring the missile unit's safe default.
    if(u.kind==="Archers"&&u.ammo>0&&u.order==="Move"&&distance(u,{x:u.tx,y:u.ty})<.5)u.order="Skirmish";
    const fleeing=u.order==="Retreat"||!active(u);
    if(fleeing){u.attackTarget=null;u.aiWaypoint=undefined;u.charging=false;u.chargeDistance=0;u.tx=u.side==="rome"?-6:106;u.ty=u.y;}
    else {
      if(u.kind==="Archers"&&u.ammo<=0&&u.order==="Skirmish"){
        if(u.ammoPolicy==='Melee')u.order='Attack';
        else if(u.ammoPolicy==='Hold'){u.order='Hold';u.tx=u.x;u.ty=u.y;u.attackTarget=null;u.aiWaypoint=null;}
        else u=fallbackOrder(u,snapshot);
      }
      const enemies=snapshot.filter(t=>t.side!==u.side&&active(t));
      const preferred=enemies.find(t=>t.id===u.attackTarget);
      if(u.side==='rome'&&u.pursue!==true&&u.attackTarget!==null&&!preferred&&['Attack','Charge','Skirmish'].includes(u.order)){
        u.order='Hold';u.tx=u.x;u.ty=u.y;u.charging=false;u.chargeDistance=0;
      }
      const auto=u.side==="carthage"||["Attack","Charge","Skirmish"].includes(u.order);
      const nearest=[...enemies].sort((a,b)=>{
        const priority=(t:BattleUnit)=>u.kind==="Cavalry"&&t.kind==="Archers"?-12:u.kind==="Spears"&&t.kind==="Cavalry"?-8:0;
        return distance(u,a)+priority(a)-distance(u,b)-priority(b)||a.id-b.id;
      })[0];
      const target=preferred??(auto?nearest:undefined);
      u.attackTarget=target?.id??null;
      if(u.side==="carthage"&&u.order==="Hold"&&target&&distance(u,target)<24&&!(u.kind==='Spears'&&u.formation==='Guard')&&!(u.kind==='Archers'&&u.ammo<=0&&u.ammoPolicy!=='Melee'))u.order="Attack";
      if(target&&u.order!=="Move"&&u.order!=="Hold"&&u.order!=="Fallback"){
        const d=distance(u,target),range=effectiveRange(u,target,c);
        if(u.order==="Skirmish"&&u.ammo>0&&d<10){
          const dx=u.x-target.x|| (u.side==="rome"?-1:1),dy=u.y-target.y,len=Math.hypot(dx,dy);
          u.tx=clamp(u.x+dx/len*10,4,96);u.ty=clamp(u.y+dy/len*10,5,95);
        }else if(d>range*.92){u.tx=target.x;u.ty=target.y;}else{u.tx=u.x;u.ty=u.y;}
        if(u.kind==="Cavalry"&&d>14)u.charging=true;
      }
    }
    let goal=u.aiWaypoint&&distance(u,u.aiWaypoint)>3?u.aiWaypoint:{x:u.tx,y:u.ty};
    if(c.walls&&u.side===(c.defensive?"carthage":"rome")&&!fleeing){const wall=c.defensive?35:70;const crosses=c.defensive?u.x>wall&&goal.x<wall:u.x<wall&&goal.x>wall;if(crosses)goal={x:c.gateOpen?goal.x:wall+(c.defensive?4:-4),y:50};}
    if(!fleeing&&u.order!=="Move"&&u.order!=="Hold")goal=crossingWaypoint(u,goal,c);
    const dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy),g=ground(u,c);
    if((fleeing||u.order!=="Hold")&&d>.15){
      const step=Math.min(d,stats.speed*3*(1-u.stamina/180)*g.movement*(u.formation==="Guard"?.78:1)*dt);
      const facing=Math.atan2(dy,dx)*180/Math.PI;
      const turn=Math.abs(((facing-u.facing+540)%360)-180);
      u.chargeDistance=u.charging&&turn<35&&!['Forest','River','Bridge'].includes(g.key)?Math.min(30,(u.chargeDistance??0)+step):0;
      u.steadySeconds=0;
      u.x+=dx/d*step;u.y=clamp(u.y+dy/d*step,5,95);if(u.order!=='Fallback')u.facing=facing;
      if(u.lockedFacing!=null)u.facing=u.lockedFacing;
      u.stamina=clamp(u.stamina+(c.weather==="Heat"?1.8:1.1)*g.fatigue*dt,0,100);
    }else {u.stamina=clamp(u.stamina-.8*dt,0,100);u.steadySeconds=(u.steadySeconds??0)+dt;}
    if(u.order==='Fallback'&&distance(u,{x:u.tx,y:u.ty})<.5){u.order='Hold';u.tx=u.x;u.ty=u.y;u.attackTarget=null;}
    if(!fleeing)u.x=clamp(u.x,4,96);
    if(c.walls&&!c.gateOpen&&u.side===(c.defensive?"carthage":"rome")&&(c.defensive?previous.x>=35:previous.x<=70))u.x=c.defensive?Math.max(38,u.x):Math.min(67,u.x);
    if(fleeing&&hasExitedBattlefield(u.side,u.x))u.withdrawn=true;
    return u;
  });
  next=separateFormations(next);
  if(c.walls&&!c.gateOpen)for(const u of next){const previous=snapshot.find(p=>p.id===u.id)!;if(u.side===(c.defensive?"carthage":"rome")&&(c.defensive?previous.x>=35:previous.x<=70))u.x=c.defensive?Math.max(38,u.x):Math.min(67,u.x);}
  const damage=new Map<number,number>(),morale=new Map<number,number>();
  for(const u of next){
    if(!active(u)||u.order==="Retreat")continue;
    const targets=next.filter(t=>t.side!==u.side&&active(t)&&distance(u,t)<=effectiveRange(u,t,c)).sort((a,b)=>(a.id===u.attackTarget?-1:b.id===u.attackTarget?1:distance(u,a)-distance(u,b)||a.id-b.id));
    const t=targets[0];if(!t)continue;
    const missile=u.kind==="Archers"&&u.ammo>0&&distance(u,t)>6.4;
    if(missile&&(u.holdFire||(u.cooldown??0)>0))continue;
    const ag=ground(u,c),stats=unitDefinition(u.key)!;
    const aspect=attackAspect(u,t),flank=aspect!=="Front";
    const factors=combatModifiers(u,t,c,missile);
    const loss=stats.attack*factors.reduce((n,m)=>n*m.factor,1)*(missile?6:3*dt);
    if(factors.some(m=>m.label==='Braced spear front'&&m.factor<1))t.bracedHits=(t.bracedHits??0)+1;
    u.damageDealt=(u.damageDealt??0)+Math.min(t.men,loss);u.flankHits=(u.flankHits??0)+(flank?1:0);u.terrainHits=(u.terrainHits??0)+((missile?ag.missile:ag.melee)>1?1:0);u.missileHits=(u.missileHits??0)+(missile?1:0);
    damage.set(t.id,(damage.get(t.id)??0)+loss);
    morale.set(t.id,(morale.get(t.id)??0)+(flank?moraleRule("surrounded")*dt:0));
    if(missile){u.ammo--;u.cooldown=2;}
    u.firedAt=t.id;u.firedMissile=missile;u.charging=false;u.chargeDistance=0;u.stamina=clamp(u.stamina+.8*ag.fatigue*dt,0,100);
  }
  for(const u of next){
    const total=(u.damageCarry??0)+(damage.get(u.id)??0),loss=Math.min(u.men,Math.floor(total));
    u.damageCarry=total-Math.floor(total);u.men-=loss;
    u.morale=clamp(u.morale-loss*moraleRule("casualty")-(morale.get(u.id)??0),0,150);
    const causes=[...(loss?['Taking casualties']:[]),...((morale.get(u.id)??0)>0?['Flank or rear exposed']:[])];
    if(causes.length){u.moraleCauses=causes;u.moraleCauseSeconds=6;}
  }
  return next;
}

export function initialBattleSnapshot(c:BattleContext):BattleSnapshot{
  return {units:c.units.map(u=>({...u})),elapsed:0,objectiveProgress:0,gateHealth:c.walls?100:0,phase:"deploy"};
}

export function tickBattle(state:BattleSnapshot,c:BattleContext):BattleSnapshot{
  if(state.phase!=="fight"||battleResult(state,c))return state;
  const elapsed=Math.round((state.elapsed+BATTLE_STEP)*10)/10;
  const planned=Math.floor(elapsed/2)!==Math.floor(state.elapsed/2)?commandAI(state.units,c,elapsed):state.units;
  let gateHealth=state.gateHealth??(c.walls?100:0);
  let units=advanceBattle(planned,BATTLE_STEP,{...c,gateOpen:gateHealth<=0});
  if(c.walls&&gateHealth>0){const gateX=c.defensive?35:70,attackers=units.filter(u=>active(u)&&u.order!=="Retreat"&&u.side===(c.defensive?"carthage":"rome")&&distance(u,{x:gateX,y:50})<7&&(u.kind!=="Archers"||u.ammo===0));gateHealth=Math.max(0,gateHealth-attackers.reduce((n,u)=>n+u.men/u.maxMen,0)*BATTLE_STEP*(c.general?.trait==="Siege Master"&&!c.defensive?6:4));}
  for(const side of ["rome","carthage"] as const){
    const reserve=side==="rome"?c.reinforcements:c.enemyReinforcements??[];
    const due=reserve.filter((u,index)=>elapsed>=25+Math.floor(index/8)*10&&!units.some(t=>t.id===u.id));
    for(let i=0;i<due.length;i++){
      const fresh=createBattle(side==="rome"?[due[i]]:[],side==="carthage"?[due[i]]:[],c.defensive,c.walls,c.general)[0];
      const x=side==="rome"?4:96,y=12+i%8*10;
      const faction=side==="rome"?c.playerFaction:c.enemyFaction;
      units=[...units,{...fresh,morale:Math.min(150,fresh.morale+(faction?factionDefinition(faction).morale:0)),x,y,tx:side==="rome"?20:80,ty:y,order:fresh.kind==="Archers"?"Skirmish":"Attack"}];
    }
  }
  const objective=battleObjective(c.defensive,c.walls),player=units.filter(u=>u.side==="rome"&&active(u)&&u.order!=="Retreat"),enemy=units.filter(u=>u.side==="carthage"&&active(u));
  const occupants=player.filter(u=>c.walls?distance(u,{x:c.defensive?20:90,y:50})<=13:objective==="Hold"?u.x<=35:u.x>=87);
  const contested=enemy.some(u=>objective==="Hold"?u.x<=35:occupants.some(p=>distance(u,p)<12));
  const holding=occupants.length>0&&!contested&&(objective!=="Breakthrough"||gateHealth<=0);
  const objectiveProgress=objective==="Rout"?0:holding?state.objectiveProgress+BATTLE_STEP:objective==="Breakthrough"?0:state.objectiveProgress;
  return {units,elapsed,objectiveProgress,gateHealth,phase:"fight"};
}

export function battleResult(s:BattleSnapshot,c:BattleContext):BattleOutcome|null{
  if(s.phase!=="fight")return null;
  const player=s.units.filter(u=>u.side==="rome"&&active(u)),enemy=s.units.filter(u=>u.side==="carthage"&&active(u));
  const waiting=(reserve:RosterUnit[])=>reserve.some(u=>!s.units.some(t=>t.id===u.id));
  if(!player.length&&!waiting(c.reinforcements))return s.units.some(u=>u.side==="rome"&&u.men>0&&u.withdrawn)?"WITHDRAWAL":"DEFEAT";
  if(!enemy.length&&!waiting(c.enemyReinforcements??[]))return "VICTORY";
  const objective=battleObjective(c.defensive,c.walls);
  if(objective!=="Rout"&&s.objectiveProgress+1e-6>=(objective==="Hold"?HOLD_SECONDS:BREACH_SECONDS))return "VICTORY";
  if(s.elapsed>=BATTLE_LIMIT)return "WITHDRAWAL";
  return null;
}
