import { unitDefinition, formationAttack, formationDefense, matchup, moraleRule, terrainRule } from "./game-content.ts";
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
  const stats=unitDefinition(a.key)!;
  // Cover reduces missile acquisition range, never melee reach. Movement and damage share this rule.
  return a.kind==="Archers"&&a.ammo>0
    ? Math.max(6.4,stats.range*(c.weather==="Fog"?.72:1)*ground(b,c).visibility)
    : a.kind==="Archers"?6.4:stats.range;
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
    return {...u,side,morale:(unitDefinition(u.key)?.morale??90)+(side==="rome"?(general?.command??0)*.45+tradition*2+(stance==="Ambush"?6:0)-(supplies<25?12:0):0),stamina:0,ammo:u.kind==="Archers"?24:0,x,y,tx:x,ty:y,facing:side==="rome"?0:180,formation:u.kind==="Cavalry"?"Wedge":u.kind==="Spears"?"Guard":"Line",attackTarget:null,charging:false,withdrawn:false,order:side==="rome"?"Move":u.kind==="Archers"?"Skirmish":walls&&!defensive?"Hold":"Attack",cooldown:0,damageCarry:0};
  };
  return [...roman.slice(0,8).map((u,i)=>make(u,i,"rome")),...punic.slice(0,8).map((u,i)=>make(u,i,"carthage"))];
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

export function advanceBattle(old:BattleUnit[],dt:number,c:BattleContext):BattleUnit[]{
  // Sort for deterministic tie-breaking and read a single snapshot for every movement decision.
  const snapshot=[...old].sort((a,b)=>a.id-b.id);
  const next=snapshot.map(previous=>{
    const u={...previous,firedAt:null as number|null,firedMissile:false,cooldown:Math.max(0,(previous.cooldown??0)-dt)};
    if(!u.men||u.withdrawn)return u;
    const stats=unitDefinition(u.key)!;
    const fleeing=u.order==="Retreat"||!active(u);
    if(fleeing){u.attackTarget=null;u.charging=false;u.tx=u.side==="rome"?-6:106;u.ty=u.y;}
    else {
      if(u.kind==="Archers"&&u.ammo<=0&&u.order==="Skirmish")u.order="Attack";
      const enemies=snapshot.filter(t=>t.side!==u.side&&active(t));
      const preferred=enemies.find(t=>t.id===u.attackTarget);
      const auto=u.side==="carthage"||["Attack","Charge","Skirmish"].includes(u.order);
      const nearest=[...enemies].sort((a,b)=>{
        const priority=(t:BattleUnit)=>u.kind==="Cavalry"&&t.kind==="Archers"?-12:u.kind==="Spears"&&t.kind==="Cavalry"?-8:0;
        return distance(u,a)+priority(a)-distance(u,b)-priority(b)||a.id-b.id;
      })[0];
      const target=preferred??(auto?nearest:undefined);
      u.attackTarget=target?.id??null;
      if(u.side==="carthage"&&u.order==="Hold"&&target&&distance(u,target)<24)u.order="Attack";
      if(target&&u.order!=="Move"&&u.order!=="Hold"){
        const d=distance(u,target),range=effectiveRange(u,target,c);
        if(u.order==="Skirmish"&&u.ammo>0&&d<10){
          const dx=u.x-target.x|| (u.side==="rome"?-1:1),dy=u.y-target.y,len=Math.hypot(dx,dy);
          u.tx=clamp(u.x+dx/len*10,4,96);u.ty=clamp(u.y+dy/len*10,5,95);
        }else if(d>range*.92){u.tx=target.x;u.ty=target.y;}else{u.tx=u.x;u.ty=u.y;}
        if(u.kind==="Cavalry"&&d>14)u.charging=true;
      }
    }
    let goal={x:u.tx,y:u.ty};
    if(!fleeing&&u.order!=="Move"&&u.order!=="Hold")goal=crossingWaypoint(u,goal,c);
    const dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy),g=ground(u,c);
    if((fleeing||u.order!=="Hold")&&d>.15){
      const step=Math.min(d,stats.speed*3*(1-u.stamina/180)*g.movement*(u.formation==="Guard"?.78:1)*dt);
      u.x+=dx/d*step;u.y=clamp(u.y+dy/d*step,5,95);u.facing=Math.atan2(dy,dx)*180/Math.PI;
      u.stamina=clamp(u.stamina+(c.weather==="Heat"?1.8:1.1)*g.fatigue*dt,0,100);
    }else u.stamina=clamp(u.stamina-.8*dt,0,100);
    if(!fleeing)u.x=clamp(u.x,4,96);
    if(fleeing&&hasExitedBattlefield(u.side,u.x))u.withdrawn=true;
    return u;
  });
  const damage=new Map<number,number>(),morale=new Map<number,number>();
  for(const u of next){
    if(!active(u)||u.order==="Retreat")continue;
    const targets=next.filter(t=>t.side!==u.side&&active(t)&&distance(u,t)<=effectiveRange(u,t,c)).sort((a,b)=>(a.id===u.attackTarget?-1:b.id===u.attackTarget?1:distance(u,a)-distance(u,b)||a.id-b.id));
    const t=targets[0];if(!t)continue;
    const missile=u.kind==="Archers"&&u.ammo>0&&distance(u,t)>6.4;
    if(missile&&(u.cooldown??0)>0)continue;
    const ag=ground(u,c),tg=ground(t,c),stats=unitDefinition(u.key)!;
    const toward=Math.atan2(u.y-t.y,u.x-t.x)*180/Math.PI,flank=Math.abs(((toward-t.facing+540)%360)-180)>115;
    const charge=u.charging&&u.kind==="Cavalry"&&!["Forest","River","Bridge"].includes(ag.key)?1.35:1;
    const wallSide=c.defensive?"rome":"carthage",inWalls=c.defensive?t.x<35:t.x>70;
    const wall=c.walls&&t.side===wallSide&&inWalls?.76:1;
    const loss=stats.attack*(u.men/u.maxMen)*matchup(u.kind,t.kind)*formationAttack(u.formation)*formationDefense(t.formation)*(flank?1.3:1)*charge*Math.max(.55,1-u.stamina/180)*(missile?ag.missile:ag.melee)*tg.incomingDamage*(missile&&c.weather==="Rain"?.76:1)*wall*(1+u.experience*.08)*(missile?6:3*dt);
    damage.set(t.id,(damage.get(t.id)??0)+loss);
    morale.set(t.id,(morale.get(t.id)??0)+(flank?moraleRule("surrounded")*dt:0));
    if(missile){u.ammo--;u.cooldown=2;}
    u.firedAt=t.id;u.firedMissile=missile;u.charging=false;u.stamina=clamp(u.stamina+.8*ag.fatigue*dt,0,100);
  }
  for(const u of next){
    const total=(u.damageCarry??0)+(damage.get(u.id)??0),loss=Math.min(u.men,Math.floor(total));
    u.damageCarry=total-Math.floor(total);u.men-=loss;
    u.morale=clamp(u.morale-loss*moraleRule("casualty")-(morale.get(u.id)??0),0,150);
  }
  return next;
}

export function initialBattleSnapshot(c:BattleContext):BattleSnapshot{
  return {units:c.units.map(u=>({...u})),elapsed:0,objectiveProgress:0,phase:"deploy"};
}

export function tickBattle(state:BattleSnapshot,c:BattleContext):BattleSnapshot{
  if(state.phase!=="fight"||battleResult(state,c))return state;
  const elapsed=Math.round((state.elapsed+BATTLE_STEP)*10)/10;
  let units=advanceBattle(state.units,BATTLE_STEP,c);
  for(const side of ["rome","carthage"] as const){
    const reserve=side==="rome"?c.reinforcements:c.enemyReinforcements??[];
    const due=reserve.filter((u,index)=>elapsed>=25+Math.floor(index/8)*10&&!units.some(t=>t.id===u.id));
    for(let i=0;i<due.length;i++){
      const fresh=createBattle(side==="rome"?[due[i]]:[],side==="carthage"?[due[i]]:[],c.defensive,c.walls,c.general)[0];
      const x=side==="rome"?4:96,y=12+i%8*10;
      units=[...units,{...fresh,x,y,tx:side==="rome"?20:80,ty:y,order:"Attack"}];
    }
  }
  const objective=battleObjective(c.defensive,c.walls),player=units.filter(u=>u.side==="rome"&&active(u)&&u.order!=="Retreat"),enemy=units.filter(u=>u.side==="carthage"&&active(u));
  const occupants=player.filter(u=>objective==="Hold"?u.x<=35:u.x>=87);
  const contested=enemy.some(u=>objective==="Hold"?u.x<=35:occupants.some(p=>distance(u,p)<12));
  const holding=occupants.length>0&&!contested;
  const objectiveProgress=objective==="Rout"?0:holding?state.objectiveProgress+BATTLE_STEP:objective==="Breakthrough"?0:state.objectiveProgress;
  return {units,elapsed,objectiveProgress,phase:"fight"};
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
