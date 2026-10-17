import { memo } from "react";

// Drawn fortifications for siege battles: a crenellated stone wall with towers,
// a gatehouse whose doors splinter as the gate is battered and lie broken once it
// falls, a town of rooftops inside the walls, and the forum to be captured.
// Positions follow the battle engine: the wall runs north–south at `wallX`%, the
// gate sits at mid-height, and the capture point is at `captureX`%.
type Props={wallX:number;captureX:number;townOnRight:boolean;gateHealth:number;style:"tile"|"japan"};

const TOWERS=[8,27,73,92];
// Deterministic rooftops so the town does not reshuffle on every render.
function houses(townOnRight:boolean,wallX:number,captureX:number){
  const out:{x:number;y:number;w:number;h:number;r:number}[]=[];
  let seed=17;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const from=townOnRight?wallX+3:3,to=townOnRight?97:wallX-3;
  for(let y=6;y<96;y+=7.5)for(let x=from;x<to;x+=4.6){
    const cx=x+rnd()*1.6,cy=y+rnd()*3;
    if(Math.abs(cy-50)<9)continue; // the road from the gate
    if(Math.hypot((cx-captureX)*1.6,cy-50)<17)continue; // the forum
    if(rnd()<.22)continue;
    out.push({x:cx,y:cy,w:16+rnd()*14,h:12+rnd()*8,r:(rnd()-.5)*14});
  }
  return out;
}

function SiegeWorksView({wallX,captureX,townOnRight,gateHealth,style}:Props){
  const stage=gateHealth<=0?"breached":gateHealth<40?"failing":gateHealth<75?"battered":"intact";
  return <div className={`siege-works ${style} ${townOnRight?"town-right":"town-left"}`} aria-hidden="true">
    <div className="town-ground" style={townOnRight?{left:`${wallX}%`,right:0}:{left:0,width:`${wallX}%`}}/>
    <div className="town-road" style={townOnRight?{left:`${wallX}%`,width:`${captureX-wallX}%`}:{left:`${captureX}%`,width:`${wallX-captureX}%`}}/>
    {houses(townOnRight,wallX,captureX).map((h,i)=><span key={i} className="house" style={{left:`${h.x}%`,top:`${h.y}%`,width:`${h.w}px`,height:`${h.h}px`,transform:`translate(-50%,-50%) rotate(${h.r.toFixed(1)}deg)`}}/>)}
    <div className="forum" style={{left:`${captureX}%`}}><i/></div>
    <div className="wall-run" style={{left:`${wallX}%`,top:0,bottom:"57%"}}/>
    <div className="wall-run" style={{left:`${wallX}%`,top:"57%",bottom:0}}/>
    {TOWERS.map(y=><span key={y} className="wall-tower" style={{left:`${wallX}%`,top:`${y}%`}}/>)}
    <div className={`gatehouse ${stage}`} style={{left:`${wallX}%`}}>
      <span className="gate-tower north"/><span className="gate-tower south"/>
      <span className="gate-door top"/><span className="gate-door bottom"/>
      {stage==="breached"&&<span className="rubble"/>}
    </div>
  </div>;
}
export const SiegeWorks=memo(SiegeWorksView);
