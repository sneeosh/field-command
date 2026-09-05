import { moraleRule } from "./game-content.ts";
import type { BattleUnit, BattleContext } from "./game-types.ts";

const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const active=(u:BattleUnit)=>u.men>0&&!u.withdrawn&&u.morale>=moraleRule("rout_threshold");
export const formationRadius=(u:BattleUnit)=>u.width==="Wide"?2.6:u.width==="Narrow"?1.65:2.1;
export function attackAspect(a:BattleUnit,t:BattleUnit){
  const bearing=Math.atan2(a.y-t.y,a.x-t.x)*180/Math.PI;
  const angle=Math.abs(((bearing-t.facing+540)%360)-180);
  return angle>135?"Rear":angle>65?"Flank":"Front";
}

/** Resolve footprints in stable ID order, without moving dead or escaped units. */
export function separateFormations(input:BattleUnit[],deployment=false){
  const units=input.map(u=>({...u})).sort((a,b)=>a.id-b.id);
  for(let pass=0;pass<6;pass++)for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
    const a=units[i],b=units[j];if(!active(a)||!active(b)||a.order==="Retreat"||b.order==="Retreat")continue;
    const min=formationRadius(a)+formationRadius(b),d=distance(a,b);if(d>=min)continue;
    const dx=d<.001?0:(a.x-b.x)/d,dy=d<.001?(a.id<b.id?-1:1):(a.y-b.y)/d;
    const push=(min-d)/2+.001;
    for(const [u,sign] of [[a,1],[b,-1]] as const){
      u.x=Math.max(deployment&&u.side==="rome"?8:4,Math.min(deployment&&u.side==="rome"?34:96,u.x+dx*push*sign));
      u.y=Math.max(deployment?11:5,Math.min(deployment?89:95,u.y+dy*push*sign));
    }
  }
  return units;
}

/** Difficulty changes choices and coordination, never troop statistics. */
export function commandAI(units:BattleUnit[],c:BattleContext,elapsed:number):BattleUnit[]{
  const enemies=units.filter(u=>u.side==="rome"&&active(u)),allies=units.filter(u=>u.side==="carthage"&&active(u));
  if(!enemies.length)return units;
  const tactical=(c.difficulty??"Commander")!=="Recruit",veteran=c.difficulty==="Veteran";
  const archers=allies.filter(u=>u.kind==="Archers"&&u.ammo>0),line=allies.filter(u=>u.kind!=="Archers");
  return units.map(u=>{
    if(u.side!=="carthage"||!active(u)||u.order==="Retreat")return u;
    if(u.kind==='Archers'&&u.ammo<=0&&u.ammoPolicy!=='Melee'){
      // An exhausted missile-only army disengages instead of waiting out the battle clock.
      if(u.order==='Hold'&&!allies.some(a=>a.kind!=='Archers'||a.ammo>0))return {...u,order:'Retreat',attackTarget:null,aiWaypoint:null,tx:106,ty:u.y};
      return u;
    }
    const nearest=[...enemies].sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id)[0];
    const intruder=c.walls&&!c.defensive?enemies.find(e=>e.x>70):undefined;
    const threatenedArcher=archers.find(a=>enemies.some(e=>e.kind==="Cavalry"&&distance(e,a)<22));
    const threat=threatenedArcher?enemies.filter(e=>e.kind==="Cavalry").sort((a,b)=>distance(a,threatenedArcher)-distance(b,threatenedArcher))[0]:undefined;
    const reserveUntil=c.personality==="aggressive"?10:c.personality==="defensive"?26:18;
    const reserve=tactical&&line.length>=4&&line[line.length-1].id===u.id&&elapsed<reserveUntil&&distance(u,nearest)>24&&!intruder&&!threat;
    if(reserve)return {...u,order:"Hold",tx:u.x,ty:u.y,attackTarget:null,aiRole:"Reserve",aiWaypoint:null};
    if(c.walls&&!c.defensive&&!intruder&&distance(u,nearest)>25&&u.kind!=="Archers")return {...u,order:"Hold",tx:u.x,ty:u.y,attackTarget:nearest.id,aiRole:"Hold walls",aiWaypoint:null};
    let target=intruder??nearest,role="Advance";
    if(tactical&&u.kind==="Spears"&&threat){target=threat;role="Protect missiles";}
    else if(tactical&&u.kind==="Cavalry"){target=enemies.filter(e=>e.kind==="Archers"&&e.ammo>0).sort((a,b)=>distance(u,a)-distance(u,b))[0]??target;role="Flank";}
    else if(veteran&&u.kind==="Archers"){target=enemies.filter(e=>e.kind!=="Spears").sort((a,b)=>(a.morale+distance(u,a))-(b.morale+distance(u,b)))[0]??target;role="Focus volleys";}
    if(intruder)role="Contest breach";
    const waypoint=tactical&&role==="Flank"&&distance(u,target)>18&&u.x>target.x+7?{x:target.x+8,y:Math.max(8,Math.min(92,target.y+(target.y<50?-16:16)))}:null;
    const brace=tactical&&u.kind==='Spears'&&target.kind==='Cavalry'&&distance(u,target)<16&&(['Attack','Charge'].includes(target.order)||distance(u,target)<6);
    return {...u,attackTarget:target.id,order:brace?'Hold':u.kind==="Archers"&&u.ammo>0?"Skirmish":"Attack",...(brace?{tx:u.x,ty:u.y}:{}),aiRole:role,aiWaypoint:waypoint,formation:tactical&&u.kind==="Spears"?"Guard":u.formation,width:c.terrain==="River"?"Narrow":u.width};
  });
}

export function battleAnalysis(units:BattleUnit[],c:BattleContext){
  const ours=units.filter(u=>u.side==="rome"),sum=(key:"flankHits"|"terrainHits"|"missileHits")=>ours.reduce((n,u)=>n+(u[key]??0),0);
  const veteran=ours.filter(u=>u.experience>0&&u.men===0).length;
  const mvp=[...ours].sort((a,b)=>(b.damageDealt??0)-(a.damageDealt??0))[0];
  return [mvp?`${mvp.name} inflicted approximately ${Math.round(mvp.damageDealt??0)} casualties.`:"No cohorts engaged.",`${sum("flankHits")} flank/rear attacks; ${sum("terrainHits")} attacks from advantageous ground; ${sum("missileHits")} missile volleys.`,`${ours.filter(u=>u.morale<moraleRule("rout_threshold")).length} cohorts routed. ${veteran} veteran cohorts were destroyed.`,c.walls?"Siege victory requires breaching the gate and securing the capture point, or routing all defenders.":"Morale, position, and surviving reserves determine whether the army can keep fighting."];
}
