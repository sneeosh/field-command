"use client";
import type { MouseEvent } from 'react';
import type { BattleContext, BattleUnit } from '../lib/game-types';
import { moraleRule, unitDefinition, terrainRule } from '../lib/game-content';
import { battlefieldFeatureAt } from '../lib/simulation-engine';
import { formationRadius } from '../lib/tactics';

export const kindIcon=(kind:BattleUnit['kind'])=>({Infantry:'⚔',Spears:'♜',Cavalry:'♞',Archers:'➶'})[kind];
export function BattleUnitMarker({unit:u,selected,inspected,number,onClick,onInspect}:{unit:BattleUnit;selected:boolean;inspected:boolean;number:number;onClick:(e:MouseEvent,u:BattleUnit)=>void;onInspect:(id:number|null)=>void}){
  const routing=u.morale<moraleRule('rout_threshold');
  return <button className={`battle-token ${u.side} ${selected?'selected':''} ${inspected?'inspected':''} ${routing?'routing':''}`}
    style={{left:`${u.x}%`,top:`${u.y}%`}}
    aria-label={`${u.side==='rome'?'Your':'Enemy'} ${u.name}, ${u.kind}, ${u.men} soldiers. ${u.side==='carthage'?'Inspect unit':'Select unit'}`}
    aria-pressed={u.side==='rome'?selected:inspected}
    title={`${u.name} · ${u.kind} · ${u.men}/${u.maxMen} soldiers · ${Math.round(u.morale)} morale · ${u.order}`}
    onPointerDown={e=>e.stopPropagation()} onClick={e=>onClick(e,u)}
    onPointerEnter={e=>{if(e.pointerType==='mouse')onInspect(u.id)}} onPointerLeave={e=>{if(e.pointerType==='mouse')onInspect(null)}}
    onFocus={()=>onInspect(u.id)} onBlur={()=>onInspect(null)}>
    <span className="token-ranks" style={{width:`${formationRadius(u)*26}px`,transform:`translate(-50%,-50%) rotate(${u.facing+90}deg)`}} aria-hidden="true">{Array.from({length:Math.max(2,Math.ceil(u.men/u.maxMen*8))},(_,i)=><i key={i}/>)}</span>
    <span className="token-facing" style={{transform:`translate(-50%,-50%) rotate(${u.facing}deg)`}} aria-hidden="true">➤</span>
    <span className="token-badge"><span aria-hidden="true">{kindIcon(u.kind)}</span><b>{number}</b></span>
    <span className="token-name">{u.name}</span><span className="token-count">{routing?'ROUT':`${u.men} men`}</span>
  </button>;
}

export function BattleInspector({unit:u,context,canAttack,onAttack,onClose}:{unit:BattleUnit|null;context:BattleContext;canAttack:boolean;onAttack:()=>void;onClose:()=>void}){
  if(!u)return <section className="battle-inspector empty" aria-label="Unit information"><strong>Know your formations</strong><p>⚔ Infantry · ♜ Spears · ♞ Cavalry · ➶ Missiles. Hover or tap a unit to inspect it. Tap an enemy, then choose Attack target to give an order.</p></section>;
  const def=unitDefinition(u.key)!,feature=battlefieldFeatureAt(context.terrain,u.x,u.y);
  return <section className={`battle-inspector ${u.side}`} aria-label="Unit information">
    <div className="inspector-title"><span aria-hidden="true">{kindIcon(u.kind)}</span><div><small>{u.side==='rome'?'YOUR UNIT':'ENEMY UNIT'} · {u.kind}</small><strong>{u.name}</strong></div><button aria-label="Close unit information" onClick={onClose}>×</button></div>
    <dl><div><dt>Soldiers</dt><dd>{u.men}/{u.maxMen}</dd></div><div><dt>Morale</dt><dd>{Math.round(u.morale)}</dd></div><div><dt>Fatigue</dt><dd>{Math.round(u.stamina)}%</dd></div>{u.kind==='Archers'&&<div><dt>Ammo</dt><dd>{u.ammo}</dd></div>}<div><dt>Order</dt><dd>{u.withdrawn?'Withdrawn':u.morale<moraleRule('rout_threshold')?'Routing':u.order}</dd></div><div><dt>Formation</dt><dd>{u.formation}</dd></div></dl>
    <p>{def.note} · {feature}: {terrainRule(feature).note}</p>
    {u.side==='carthage'&&<button className="inspect-attack" disabled={!canAttack} onClick={onAttack}>{canAttack?'Attack target with selected units':'Select your troops and begin battle to attack'}</button>}
  </section>;
}
