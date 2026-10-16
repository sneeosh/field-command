import { memo } from "react";
import type { BattleUnit } from "../lib/game-types";

// Top-down soldier figures. Each symbol faces "up" (-y) with its body centred on
// (0,0); a unit's figures are laid out in ranks and the whole group is rotated to
// the unit's facing. Colours come from CSS custom properties on `.soldiers`, so a
// single drawing serves every faction and theater.
export function SoldierSpriteDefs(){
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:"absolute"}}>
    <defs>
      <symbol id="spr-inf" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.2" rx="6.4" ry="3.6" className="spr-body"/>
        <path d="M4.6 -1 L5.2 -8.5" stroke="#d9d6cc" strokeWidth="1.2" strokeLinecap="round"/>
        <rect x="-8" y="-5.8" width="10.5" height="3.4" rx="1.5" className="spr-shield"/>
        <circle cx="-2.75" cy="-4.1" r=".9" className="spr-trim"/>
        <circle cx="0" cy="0.6" r="2.7" className="spr-helm"/>
        <path d="M0 -1.8 V3.2" className="spr-plume"/>
      </symbol>
      <symbol id="spr-inf-strike" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.2" rx="6.4" ry="3.6" transform="rotate(-14)" className="spr-body"/>
        <path d="M3.6 -2 L4.4 -13" stroke="#d9d6cc" strokeWidth="1.2" strokeLinecap="round"/>
        <rect x="-8.5" y="-7.6" width="10.5" height="3.4" rx="1.5" className="spr-shield"/>
        <circle cx="0" cy="0" r="2.7" className="spr-helm"/>
        <path d="M0 -2.4 V2.6" className="spr-plume"/>
      </symbol>
      <symbol id="spr-brace" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.6" rx="6.4" ry="3.6" className="spr-body"/>
        <path d="M4.2 6 L4.2 -19.5" stroke="#6b4a2a" strokeWidth="1"/>
        <path d="M3.3 -19 L4.2 -23 L5.1 -19 Z" fill="#d9d6cc"/>
        <rect x="-7.2" y="-6.4" width="14.4" height="3.8" rx="1.6" className="spr-shield"/>
        <circle cx="0" cy="1" r="2.7" className="spr-helm"/>
        <path d="M0 -1.4 V3.6" className="spr-plume"/>
      </symbol>
      <symbol id="spr-spear" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.2" rx="6.4" ry="3.6" className="spr-body"/>
        <path d="M4.2 6 L4.2 -19.5" stroke="#6b4a2a" strokeWidth="1"/>
        <path d="M3.3 -19 L4.2 -23 L5.1 -19 Z" fill="#d9d6cc"/>
        <rect x="-8" y="-5.8" width="10.5" height="3.4" rx="1.5" className="spr-shield"/>
        <circle cx="0" cy="0.6" r="2.7" className="spr-helm"/>
        <path d="M0 -1.8 V3.2" className="spr-plume"/>
      </symbol>
      <symbol id="spr-spear-round" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.2" rx="6.2" ry="3.5" className="spr-body"/>
        <path d="M4.2 6 L4.2 -19.5" stroke="#6b4a2a" strokeWidth="1"/>
        <path d="M3.3 -19 L4.2 -23 L5.1 -19 Z" fill="#d9d6cc"/>
        <circle cx="-2.6" cy="-3.6" r="4.8" className="spr-shield"/>
        <circle cx="-2.6" cy="-3.6" r="2.5" fill="none" className="spr-ring"/>
        <circle cx="0" cy="0.8" r="2.6" className="spr-helm"/>
      </symbol>
      <symbol id="spr-skirm" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.1" rx="5.4" ry="3" className="spr-body"/>
        <path d="M3.4 3 L6 -12 M4.6 3.4 L7.4 -11" stroke="#6b4a2a" strokeWidth=".7"/>
        <circle cx="-4.6" cy="-2.2" r="3.1" className="spr-shield"/>
        <circle cx="0" cy="0.6" r="2.5" className="spr-hood"/>
      </symbol>
      <symbol id="spr-cav" viewBox="-12 -24 24 36">
        <g transform="translate(0 -4)">
          <path d="M0 11.5 Q-1 14 0.4 15.6" className="spr-tail"/>
          <ellipse cx="0" cy="3" rx="3.8" ry="8.6" className="spr-horse"/>
          <ellipse cx="0" cy="-8" rx="2" ry="4.2" className="spr-horse"/>
          <rect x="-4.4" y="-0.5" width="8.8" height="6.5" rx="1.2" className="spr-cloth"/>
          <ellipse cx="0" cy="1.6" rx="5" ry="2.8" className="spr-body"/>
          <path d="M4.4 7 L4.4 -16.5" stroke="#6b4a2a" strokeWidth=".9"/>
          <path d="M3.6 -16 L4.4 -19.5 L5.2 -16 Z" fill="#d9d6cc"/>
          <circle cx="-4.6" cy="1.2" r="2.8" className="spr-shield"/>
          <circle cx="0" cy="1.2" r="2.2" className="spr-helm"/>
        </g>
      </symbol>
      <symbol id="spr-rout" viewBox="-12 -24 24 36">
        <ellipse cx="0" cy="1.2" rx="6" ry="3.4" className="spr-body"/>
        <path d="M-5 2 L-6.5 -3 M5 2 L6.5 -3" stroke="#c8a07a" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="0" cy="0.6" r="2.7" className="spr-helm"/>
      </symbol>
    </defs>
  </svg>;
}

// Units whose figures wear mail rather than a coloured tunic.
const MAIL=new Set(["principes","triarii","equites","hypaspists","companions","katana-samurai","mounted-samurai"]);
const FIGURE=18, HALF=FIGURE/2; // rendered figure width in px; height is 1.5×

type Spot={x:number;y:number;a:number;sprite:string};

function jitter(seed:number,i:number){const v=Math.sin(seed*91.7+i*12.9898)*43758.5453;return v-Math.floor(v)-.5}

export function soldierLayout(u:Pick<BattleUnit,"id"|"kind"|"side"|"men"|"formation"|"width">,routing:boolean,fighting:boolean,frontage:number):Spot[]{
  const cav=u.kind==="Cavalry";
  const count=Math.max(3,Math.min(cav?12:30,Math.round(u.men/(cav?4:5))));
  const base=u.kind==="Infantry"?"spr-inf":u.kind==="Spears"?(u.side==="rome"?"spr-spear":"spr-spear-round"):u.kind==="Archers"?"spr-skirm":"spr-cav";
  const guard=u.formation==="Guard"&&!cav;
  const sprite=routing?"spr-rout":guard&&u.kind==="Spears"?"spr-brace":base;
  const dx=cav?15:guard?9.5:u.kind==="Archers"?13:10.5, dy=cav?21:guard?11:u.kind==="Archers"?15:12.5;
  const loose=routing?3.4:u.kind==="Archers"?1.6:cav?.45:.5;
  const out:Spot[]=[];
  if(u.formation==="Wedge"&&!routing){
    for(let k=0,i=0;i<count;k++)for(let f=0;f<=k&&i<count;f++,i++)
      out.push({x:(f-k/2)*dx,y:k*dy-count/6*dy,a:0,sprite});
  }else{
    const files=Math.max(3,Math.min(count,Math.round(frontage*1.2/dx))),ranks=Math.ceil(count/files);
    for(let i=0;i<count;i++){
      const r=Math.floor(i/files),f=i%files,inRank=Math.min(files,count-r*files);
      out.push({x:(f-(inRank-1)/2)*dx,y:(r-(ranks-1)/2)*dy,a:0,sprite:fighting&&r===0&&u.kind==="Infantry"&&!routing&&(f+r)%2===0?"spr-inf-strike":sprite});
    }
  }
  return out.map((s,i)=>({...s,
    x:s.x+jitter(u.id,i)*dx*loose,
    y:s.y+jitter(u.id+7,i)*dy*loose,
    a:(routing?180:0)+jitter(u.id+3,i)*(routing?70:u.kind==="Archers"?24:8)}));
}

// How far the formation reaches above its centre on screen, so the unit's standard
// can float clear of the men whatever the facing.
export function formationReach(u:BattleUnit,routing:boolean,frontage:number){
  const spots=soldierLayout(u,routing,false,frontage),t=(u.facing+90)*Math.PI/180;
  return Math.max(...spots.map(s=>-(s.x*Math.sin(t)+s.y*Math.cos(t))))+FIGURE*.6;
}

type FormationProps={unit:BattleUnit;routing:boolean;fighting:boolean;frontage:number};
function SoldierFormationView({unit:u,routing,fighting,frontage}:FormationProps){
  const spots=soldierLayout(u,routing,fighting,frontage);
  const xs=spots.map(s=>s.x),ys=spots.map(s=>s.y);
  const pad=FIGURE*1.6;
  const minX=Math.min(...xs)-pad,maxX=Math.max(...xs)+pad,minY=Math.min(...ys)-pad*1.4,maxY=Math.max(...ys)+pad;
  const w=maxX-minX,h=maxY-minY;
  return <svg className={`soldiers ${MAIL.has(u.key)?"mail":""} ${u.kind.toLowerCase()}`} width={w} height={h} viewBox={`${minX} ${minY} ${w} ${h}`}
    style={{transform:`translate(-50%,-50%) rotate(${u.facing+90}deg)`}} aria-hidden="true" focusable="false">
    {spots.map((s,i)=><use key={i} href={`#${s.sprite}`} x={s.x-HALF} y={s.y-FIGURE} width={FIGURE} height={FIGURE*1.5}
      transform={s.a?`rotate(${s.a.toFixed(1)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`:undefined}/>)}
  </svg>;
}

// Figures only change with headcount, formation, facing and state, not every tick of movement.
export const SoldierFormation=memo(SoldierFormationView,(a,b)=>a.routing===b.routing&&a.fighting===b.fighting&&a.frontage===b.frontage&&
  a.unit.id===b.unit.id&&a.unit.men===b.unit.men&&a.unit.formation===b.unit.formation&&a.unit.facing===b.unit.facing&&a.unit.key===b.unit.key&&a.unit.side===b.unit.side);
