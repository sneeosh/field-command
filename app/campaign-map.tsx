"use client";
/* eslint-disable @next/next/no-img-element -- editable map assets */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { theaterDefinition, factionDefinition, theaterRoutes } from "../lib/game-content";
import { clampPan, layoutMap, type Point } from "../lib/map-layout";
import type { Campaign } from "../lib/game-types";

export function CampaignMap({campaign:c,expanded,onExpand,onCity,onArmy}:{campaign:Campaign;expanded:boolean;onExpand:()=>void;onCity:(id:number)=>void;onArmy:(id:number)=>void}){
  const theater=theaterDefinition(c.theater),player=factionDefinition(theater.playerFaction),enemy=factionDefinition(theater.enemyFaction);
  const viewport=useRef<HTMLDivElement>(null),drag=useRef<{start:Point;pan:Point;moved:boolean}|null>(null);
  const [size,setSize]=useState({x:800,y:600}),[zoom,setZoom]=useState(c.theater==="greece"?1.6:1.15),[pan,setPan]=useState<Point>({x:0,y:0});
  const base=Math.min(size.x*.92,size.y*.92*theater.aspect),width=base*zoom,height=width/theater.aspect;
  const bounded=clampPan(pan,width,height,size),layout=layoutMap(c.cities,c.armies,width,height);
  useEffect(()=>{const el=viewport.current;if(!el)return;const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setSize({x:r.width,y:r.height})});observer.observe(el);return()=>observer.disconnect()},[]);
  function focus(id:number){const city=c.cities.find(x=>x.id===id);if(city)setPan(clampPan({x:(.5-city.x/100)*width,y:(.5-city.y/100)*height},width,height,size));}
  function zoomTo(value:number){setZoom(Math.max(1,Math.min(3,Math.round(value*10)/10)))}
  return <div className="strategic-map">
    <div className="strategic-toolbar"><span>{theater.name}<small>Drag to pan · + / − to zoom</small></span><div>
      <button aria-label="Zoom out" disabled={zoom<=1} onClick={()=>zoomTo(zoom-.2)}>−</button><output>{Math.round(zoom*100)}%</output><button aria-label="Zoom in" disabled={zoom>=3} onClick={()=>zoomTo(zoom+.2)}>+</button>
      <button onClick={()=>{setZoom(1);setPan({x:0,y:0})}}>Fit</button><button onClick={()=>focus(c.selectedCity)}>Focus</button><button aria-pressed={expanded} onClick={onExpand}>{expanded?"Show panels":"Expand"}</button>
    </div></div>
    <div className="map-viewport" ref={viewport} tabIndex={0} aria-label="Campaign map. Drag or use arrow keys to pan; plus and minus zoom."
      onKeyDown={e=>{if((e.target as HTMLElement).closest("button"))return;const delta:Record<string,Point>={ArrowLeft:{x:60,y:0},ArrowRight:{x:-60,y:0},ArrowUp:{x:0,y:60},ArrowDown:{x:0,y:-60}};if(delta[e.key]){e.preventDefault();setPan(clampPan({x:bounded.x+delta[e.key].x,y:bounded.y+delta[e.key].y},width,height,size))}else if(e.key==="+"||e.key==="=")zoomTo(zoom+.2);else if(e.key==="-")zoomTo(zoom-.2)}}
      onPointerDown={e=>{if((e.target as HTMLElement).closest("button"))return;drag.current={start:{x:e.clientX,y:e.clientY},pan:bounded,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;d.moved=true;setPan(clampPan({x:d.pan.x+e.clientX-d.start.x,y:d.pan.y+e.clientY-d.start.y},width,height,size))}}
      onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
      <div className="map-projection" style={{width,height,left:`calc(50% + ${bounded.x}px)`,top:`calc(50% + ${bounded.y}px)`}}>
        <img src={theater.map} alt={`${theater.name} geography`} draggable={false}/>
        <svg className="strategic-routes" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">{theaterRoutes(c.theater).map(r=>{const a=layout.anchors.find(x=>x.id===r.from),b=layout.anchors.find(x=>x.id===r.to);return a&&b?<line key={`${r.from}-${r.to}`} className={`route-${r.type}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>:null})}{c.armies.map(a=>{const city=layout.anchors.find(x=>x.id===a.cityId),token=layout.tokens.get(a.id);return city&&token?<line key={`leader-${a.id}`} className="army-leader" x1={city.x} y1={city.y} x2={token.x} y2={token.y}/>:null})}</svg>
        {layout.anchors.map(city=>{const label=layout.labels.get(city.id)!;const owner=c.cities.find(x=>x.id===city.id)!.owner;return <div key={city.id}>
          <button className={`settlement-pin ${owner} ${city.id===c.selectedCity?"selected":""}`} aria-label={`Select ${city.name}`} aria-pressed={city.id===c.selectedCity} style={{left:city.x,top:city.y}} onClick={()=>onCity(city.id)}>{city.id===theater.objectiveCity?"★":"●"}</button>
          <button className={`settlement-label ${city.id===c.selectedCity?"selected":""}`} style={{left:label.x,top:label.y}} onClick={()=>onCity(city.id)}>{city.name}</button>
        </div>})}
        {c.armies.map(a=>{const pos=layout.tokens.get(a.id);return pos?<button key={a.id} className={`map-army ${a.side} ${a.id===c.selectedArmy?"selected":""}`} title={`${a.name} · ${a.units.length} cohorts`} aria-label={`Select ${a.name}, ${a.units.length} cohorts`} style={{left:pos.x,top:pos.y} as CSSProperties} onClick={()=>onArmy(a.id)}><b>{a.side==="rome"?"⚑":"♜"}</b><small>{a.units.length}</small>{a.targetCityId&&<em>→</em>}</button>:null})}
      </div>
    </div>
    <nav className="settlement-index" aria-label="Find a settlement">{c.cities.map(city=><button className={city.id===c.selectedCity?"active":""} key={city.id} onClick={()=>{onCity(city.id);focus(city.id)}}><i style={{background:city.owner==="rome"?player.color:enemy.color}}/>{city.name}{city.id===theater.objectiveCity&&" ★"}</button>)}</nav>
  </div>;
}
