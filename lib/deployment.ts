import { battlefieldFeatureAt, type BattlefieldTerrain } from './simulation-engine.ts';
import type { BattleUnit, BattleContext } from './game-types.ts';

/** A bounded, deterministic starting plan: a screen in front, missiles behind, cavalry on wings. */
export function autoDeploy(units:BattleUnit[], terrain:BattlefieldTerrain='Plains', playerOnly=false, fortifiedEnemy=false):BattleUnit[]{
  const placed=new Map<number,{x:number;y:number}>();
  for(const side of ['rome','carthage'] as const){
    if(playerOnly&&side!=='rome')continue;
    const army=units.filter(u=>u.side===side&&u.men>0&&!u.withdrawn);
    const line=army.filter(u=>u.kind==='Infantry'||u.kind==='Spears');
    const missiles=army.filter(u=>u.kind==='Archers');
    const cavalry=army.filter(u=>u.kind==='Cavalry');
    const mirror=(x:number)=>side==='rome'?x:100-x;
    const occupied:{x:number;y:number}[]=[];
    function place(group:BattleUnit[],role:'line'|'missile'|'cavalry'){
      group.forEach((u,i)=>{
        const idealY=role==='cavalry'?(i%2===0?14+Math.floor(i/2)*13:86-Math.floor(i/2)*13)
          :50+(i-(group.length-1)/2)*Math.min(14,60/Math.max(1,group.length-1));
        const front=side==='carthage'&&fortifiedEnemy?24:31;
        const idealX=role==='line'?front:role==='missile'?(line.length?front-12:front-4):front-8;
        const candidates=[idealX-3,idealX,Math.min(34,idealX+3)].flatMap(x=>
          [idealY,idealY-7,idealY+7].filter(y=>y>=11&&y<=89).map(y=>({x:mirror(x),y})));
        const score=(p:{x:number;y:number})=>{
          const feature=battlefieldFeatureAt(terrain,p.x,p.y);
          const terrainBonus=feature==='Hill'?(role==='missile'?10:6):feature==='Forest'?(role==='cavalry'?-24:4):0;
          const collision=occupied.reduce((n,o)=>n+Math.max(0,10-Math.hypot(o.x-p.x,o.y-p.y))*1000,0);
          return collision+Math.abs(p.y-idealY)+Math.abs(p.x-mirror(idealX))*1.5-terrainBonus;
        };
        const best=candidates.sort((a,b)=>score(a)-score(b)||a.y-b.y||a.x-b.x)[0];
        placed.set(u.id,best);occupied.push(best);
      });
    }
    place(line,'line');place(missiles,'missile');place(cavalry,'cavalry');
  }
  return units.map(u=>{const p=placed.get(u.id);return p?{...u,...p,tx:p.x,ty:p.y,facing:u.side==='rome'?0:180,lockedFacing:null,attackTarget:null,charging:false,aiWaypoint:null}:u});
}

/** An attack target is not permission to charge missile troops into melee. */
export function attackOrder(u:BattleUnit):BattleUnit['order']{
  return u.kind==='Archers'&&u.ammo>0?'Skirmish':u.kind==='Cavalry'?'Charge':'Attack';
}

/** Display numbers do not change when reserve waves arrive or cohorts rout. */
export function battleUnitNumbers(c:BattleContext){
  const numbers=new Map<number,number>();
  for(const side of ['rome','carthage'] as const){
    const roster=[...c.units.filter(u=>u.side===side),...(side==='rome'?c.reinforcements:c.enemyReinforcements??[])];
    roster.forEach((u,i)=>numbers.set(u.id,i+1));
  }
  return numbers;
}
