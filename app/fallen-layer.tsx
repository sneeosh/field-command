"use client";
import { memo, useEffect, useRef, useState } from "react";
import type { BattleUnit } from "../lib/game-types";
import { fallenSprite, unitFinish } from "./soldier-sprites";

// Men lost per fallen figure: matches the live formations (one figure ≈ 5 men, 4 for cavalry).
const MEN_PER_FIGURE=(u:BattleUnit)=>u.kind==="Cavalry"?4:5;
const MAX_FALLEN=320;

type Fallen={id:number;x:number;y:number;dx:number;dy:number;a:number;sprite:string;side:string;finish:string;kind:string};
type Track={men:number;carry:number};

let nextId=1;
const rand=()=>Math.random();

// Casualties stay where they fell for the rest of the battle. The layer watches each
// unit's headcount and drops a figure at the unit's fighting front for every few men lost.
export function FallenLayer({units}:{units:BattleUnit[]}){
  const seen=useRef(new Map<number,Track>());
  const [fallen,setFallen]=useState<Fallen[]>([]);
  useEffect(()=>{
    const added:Fallen[]=[];let reset=false;
    for(const u of units){
      const prev=seen.current.get(u.id);
      // A larger headcount than before means a fresh battle with reused ids.
      if(prev&&u.men>prev.men){reset=true;break}
      if(!prev){seen.current.set(u.id,{men:u.men,carry:0});continue}
      const lost=prev.men-u.men;
      if(lost<=0||u.withdrawn){prev.men=u.men;continue}
      let carry=prev.carry+lost;const per=MEN_PER_FIGURE(u);
      const f=u.facing*Math.PI/180,front=[Math.cos(f),Math.sin(f)],side=[-Math.sin(f),Math.cos(f)];
      const depth=u.kind==="Cavalry"?14:10,width=u.kind==="Cavalry"?30:34;
      while(carry>=per){
        carry-=per;
        const along=(rand()-.5)*width*2,ahead=depth*(.3+rand()*.9);
        added.push({id:nextId++,x:u.x,y:u.y,
          dx:front[0]*ahead+side[0]*along,dy:front[1]*ahead+side[1]*along,a:rand()*360,
          sprite:fallenSprite(u),side:u.side,finish:unitFinish(u.key),kind:u.kind.toLowerCase()});
      }
      seen.current.set(u.id,{men:u.men,carry});
    }
    // State updates are deferred to the next frame; the headcount tracking above is already committed.
    if(reset){seen.current=new Map(units.map(u=>[u.id,{men:u.men,carry:0}]));requestAnimationFrame(()=>setFallen([]));return}
    if(added.length)requestAnimationFrame(()=>setFallen(old=>{const all=old.concat(added);return all.length>MAX_FALLEN?all.slice(all.length-MAX_FALLEN):all}));
  },[units]);
  return <div className="fallen-layer" aria-hidden="true">{fallen.map(c=><FallenFigure key={c.id} c={c}/>)}</div>;
}

const FallenFigure=memo(function FallenFigure({c}:{c:Fallen}){
  return <svg className={`corpse ${c.side} ${c.finish} ${c.kind}`} width="18" height="27" viewBox="-12 -24 24 36" focusable="false"
    style={{left:`${c.x}%`,top:`${c.y}%`,transform:`translate(calc(-50% + ${c.dx.toFixed(1)}px),calc(-60% + ${c.dy.toFixed(1)}px)) rotate(${c.a.toFixed(0)}deg)`}}>
    <use href={`#${c.sprite}`}/>
  </svg>;
});
