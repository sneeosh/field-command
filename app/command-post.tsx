import { memo } from "react";
import type { BattleUnit } from "../lib/game-types";

// Each army's commander rides with a small bodyguard behind the centre of the line,
// under a great standard: the eagle of Rome, Tanit's disc and crescent for Carthage,
// a sunburst for the Greek armies and a golden war fan for Japanese lords. Generals
// have no position in the rules (their command bonus applies army-wide), so the
// post is ceremonial: it follows the army and does not block or fight.
type Style="rome"|"punic"|"greek"|"japan";
const GREEK=["pezhetairoi","hypaspists","hoplites","peltasts","companions"];
export function armyStyle(units:BattleUnit[],side:"rome"|"carthage"):Style{
  if(units.some(u=>u.key.includes("ashigaru")||u.key.includes("samurai")||u.key==="warrior-monks"))return "japan";
  if(units.some(u=>GREEK.includes(u.key)))return "greek";
  return side==="rome"?"rome":"punic";
}
const MOUNT:Record<Style,string>={rome:"spr-cav",punic:"spr-cav",greek:"spr-companion",japan:"spr-samurai-cav"};

function Standard({style}:{style:Style}){
  return <svg className={`command-standard ${style}`} viewBox="0 0 30 60" aria-hidden="true" focusable="false">
    <path d="M15 60 V12" className="std-pole"/>
    {style==="rome"&&<>
      <rect x="7" y="24" width="16" height="13" className="std-cloth"/><path d="M7 37 h16" className="std-fringe"/>
      <circle cx="15" cy="17" r="4.2" className="std-wreath"/>
      <path d="M15 12 L2 3 L5 11 L10 10 Z M15 12 L28 3 L25 11 L20 10 Z" className="std-gold"/>
      <ellipse cx="15" cy="9.5" rx="2.6" ry="4" className="std-gold"/><circle cx="15" cy="5" r="1.7" className="std-gold"/>
    </>}
    {style==="punic"&&<>
      <rect x="7" y="26" width="16" height="13" className="std-cloth"/><path d="M7 39 h16" className="std-fringe"/>
      <circle cx="15" cy="9" r="4.4" className="std-gold"/>
      <path d="M6 15 Q15 25 24 15 Q15 21 6 15 Z" className="std-gold"/>
    </>}
    {style==="greek"&&<>
      <rect x="7" y="26" width="16" height="13" className="std-cloth"/><path d="M7 39 h16" className="std-fringe"/>
      <path d="M15 1 L16.6 7.8 L22.8 4.6 L19.4 10.6 L26 12 L19.4 13.4 L22.8 19.4 L16.6 16.2 L15 23 L13.4 16.2 L7.2 19.4 L10.6 13.4 L4 12 L10.6 10.6 L7.2 4.6 L13.4 7.8 Z" className="std-gold"/>
      <circle cx="15" cy="12" r="3" className="std-cloth"/>
    </>}
    {style==="japan"&&<>
      <rect x="17" y="16" width="8" height="34" className="std-cloth"/><circle cx="21" cy="24" r="2.6" className="std-mon"/>
      <path d="M15 17 L2 6 A17 17 0 0 1 28 6 Z" className="std-gold"/>
      <path d="M15 17 L6 3 M15 17 L11 1 M15 17 L19 1 M15 17 L24 3" className="std-ribs"/>
    </>}
  </svg>;
}

function CommandPostView({units,side,name,style}:{units:BattleUnit[];side:"rome"|"carthage";name:string;style:Style}){
  const own=units.filter(u=>u.side===side&&u.men>0&&!u.withdrawn),foe=units.filter(u=>u.side!==side&&u.men>0&&!u.withdrawn);
  if(!own.length)return null;
  const mean=(xs:BattleUnit[])=>({x:xs.reduce((n,u)=>n+u.x,0)/xs.length,y:xs.reduce((n,u)=>n+u.y,0)/xs.length});
  const c=mean(own),e=foe.length?mean(foe):{x:side==="rome"?100:0,y:c.y};
  const dx=c.x-e.x,dy=c.y-e.y,len=Math.hypot(dx,dy)||1,rx=dx/len,ry=dy/len;
  // Ride clear of the rearmost unit, along the line from the enemy through the army's centre.
  const rear=Math.max(0,...own.map(u=>(u.x-c.x)*rx+(u.y-c.y)*ry))+6;
  const x=Math.max(4,Math.min(96,c.x+rx*rear)),y=Math.max(10,Math.min(90,c.y+ry*rear));
  const facing=Math.atan2(e.y-c.y,e.x-c.x)*180/Math.PI;
  const mount=MOUNT[style];
  return <div className={`command-post ${side} ${style}`} style={{left:`${x}%`,top:`${y}%`}} aria-hidden="true">
    <svg className="soldiers cavalry command-riders" width="78" height="78" viewBox="-39 -39 78 78" style={{transform:`translate(-50%,-50%) rotate(${facing+90}deg)`}}>
      {[[-15,10],[15,10],[0,19]].map(([bx,by],i)=><use key={i} href={`#${mount}`} x={bx-9} y={by-18} width="18" height="27"/>)}
      <use href={`#${mount}`} x={-12} y={-24} width="24" height="36" className="general-figure"/>
    </svg>
    <Standard style={style}/>
    <small className="command-name">{name}</small>
  </div>;
}
export const CommandPost=memo(CommandPostView);
