"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { BattleUnit } from "../lib/game-types";

// Missile volleys drawn as individual projectiles. Whenever a unit looses missiles
// at a target, a volley of arrows or javelins arcs from the shooters to the target,
// with a shadow on the ground beneath each one. Arrows that land stay stuck in the
// ground for a few seconds before fading, and so do some javelins.
type Kind="arrow"|"javelin";
type Shot={id:number;x:number;y:number;dx:number;dy:number;angle:number;height:number;dur:number;delay:number;kind:Kind;side:string;stuck:boolean};

const VOLLEY_GAP=900; // ms between visible volleys from one unit
const MAX_SHOTS=260;
const projectileKind=(key:string):Kind=>key==="yumi-ashigaru"||key==="archers"||key.includes("bow")?"arrow":"javelin";
let nextId=1;

export function ProjectileLayer({units,active,paused}:{units:BattleUnit[];active:boolean;paused:boolean}){
  const box=useRef<HTMLDivElement>(null);
  const lastVolley=useRef(new Map<number,number>());
  const [shots,setShots]=useState<Shot[]>([]);
  useEffect(()=>{
    if(!active||paused||!box.current)return;
    const {width:W,height:H}=box.current.getBoundingClientRect();
    if(!W||!H)return;
    const now=performance.now(),added:Shot[]=[];
    for(const u of units){
      if(!u.firedMissile||u.firedAt==null||u.withdrawn)continue;
      const target=units.find(t=>t.id===u.firedAt);
      if(!target||now-(lastVolley.current.get(u.id)??-1e9)<VOLLEY_GAP)continue;
      lastVolley.current.set(u.id,now);
      const kind=projectileKind(u.key),count=Math.max(3,Math.min(kind==="arrow"?12:8,Math.round(u.men/(kind==="arrow"?9:12))));
      for(let i=0;i<count;i++){
        const x0=u.x/100*W+(Math.random()-.5)*34,y0=u.y/100*H+(Math.random()-.5)*20;
        const x1=target.x/100*W+(Math.random()-.5)*40,y1=target.y/100*H+(Math.random()-.5)*30;
        const dx=x1-x0,dy=y1-y0,dist=Math.hypot(dx,dy);
        added.push({id:nextId++,x:x0,y:y0,dx,dy,angle:Math.atan2(dy,dx)*180/Math.PI,
          height:Math.min(60,dist*(kind==="arrow"?.32:.22)),dur:kind==="arrow"?.75+dist/900:.6+dist/700,
          delay:Math.random()*.28,kind,side:u.side,stuck:false});
      }
    }
    if(added.length)requestAnimationFrame(()=>setShots(old=>{const all=old.concat(added);return all.length>MAX_SHOTS?all.slice(all.length-MAX_SHOTS):all}));
  },[units,active,paused]);
  const land=useCallback((id:number)=>setShots(old=>old.flatMap(s=>s.id!==id?[s]:Math.random()<(s.kind==="arrow"?.55:.4)?[{...s,stuck:true}]:[])),[]);
  const clear=useCallback((id:number)=>setShots(old=>old.filter(s=>s.id!==id)),[]);
  return <div ref={box} className={`projectile-layer ${paused?"paused":""}`} aria-hidden="true">
    {shots.map(s=><Projectile key={s.id} s={s} onLand={land} onGone={clear}/>)}
  </div>;
}

const Projectile=memo(function Projectile({s,onLand,onGone}:{s:Shot;onLand:(id:number)=>void;onGone:(id:number)=>void}){
  const style={left:`${s.x}px`,top:`${s.y}px`,"--dx":`${s.dx}px`,"--dy":`${s.dy}px`,"--h":`${-s.height}px`,
    "--angle":`${s.angle}deg`,animationDuration:`${s.dur}s`,animationDelay:`${s.delay}s`} as React.CSSProperties;
  if(s.stuck)return <span className={`missile stuck ${s.kind} ${s.side}`} style={{left:`${s.x+s.dx}px`,top:`${s.y+s.dy}px`,"--angle":`${s.angle}deg`} as React.CSSProperties}
    onAnimationEnd={()=>onGone(s.id)}><i/></span>;
  return <span className={`missile flying ${s.kind} ${s.side}`} style={style} onAnimationEnd={e=>{if(e.target===e.currentTarget)onLand(s.id)}}>
    <b className="missile-shadow"/>
    <i className="missile-body" style={{animationDuration:`${s.dur}s`,animationDelay:`${s.delay}s`}}/>
  </span>;
});
