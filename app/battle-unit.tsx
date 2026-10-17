"use client";
import type { MouseEvent } from 'react';
import type { BattleContext, BattleUnit } from '../lib/game-types';
import { moraleRule, unitDefinition, terrainRule } from '../lib/game-content';
import { battlefieldFeatureAt } from '../lib/simulation-engine';
import { formationRadius } from '../lib/tactics';
import {moraleState} from '../lib/battle-rules';
import { SoldierFormation, formationReach } from './soldier-sprites';
import { UnitPortrait } from './unit-portrait';

export const kindIcon=(kind:BattleUnit['kind'])=>({Infantry:'⚔',Spears:'♜',Cavalry:'♞',Archers:'➶'})[kind];
export function BattleUnitMarker({unit:u,selected,inspected,number,onClick,onInspect,enemyAction='inspect',crowded=false,detailed=false}:{unit:BattleUnit;selected:boolean;inspected:boolean;number:number;onClick:(e:MouseEvent,u:BattleUnit)=>void;onInspect:(id:number|null)=>void;enemyAction?:'attack'|'inspect'|'ignore';crowded?:boolean;detailed?:boolean}){
  const routing=u.morale<moraleRule('rout_threshold');
  const moving=!routing&&(u.charging||Math.hypot(u.tx-u.x,u.ty-u.y)>.4);
  const dusty=moving&&(u.kind==='Cavalry'||u.charging);
  const rallied=!routing&&!!u.rallyUsed&&(u.moraleCauseSeconds??0)>0&&!!u.moraleCauses?.some(c=>c.startsWith('Rallied'));
  return <button className={`battle-token ${u.side} ${selected?'selected':''} ${inspected?'inspected':''} ${routing?'routing':''} ${crowded?'crowded':''} ${detailed?'detailed':''} ${moving?'moving':''} ${u.charging?'charging':''} ${rallied?'rallied':''}`}
    style={{left:`${u.x}%`,top:`${u.y}%`,['--banner-y' as string]:`${-Math.min(64,Math.round(formationReach(u,routing,formationRadius(u)*26))+6)}px`}}
    aria-label={`${u.side==='rome'?'Your':'Enemy'} ${u.name}, ${u.kind}, ${u.men} soldiers. ${u.side==='carthage'?(enemyAction==='attack'?'Attack with selected troops':enemyAction==='inspect'?'Inspect unit':'Attack unavailable'):'Select unit'}`}
    aria-pressed={u.side==='rome'?selected:inspected}
    title={`${u.name} · ${u.kind} · ${u.men}/${u.maxMen} soldiers · ${Math.round(u.morale)} morale · ${u.order}`}
    onPointerDown={e=>e.stopPropagation()} onClick={e=>onClick(e,u)}
    onPointerEnter={e=>{if(e.pointerType==='mouse')onInspect(u.id)}} onPointerLeave={e=>{if(e.pointerType==='mouse')onInspect(null)}}
    onFocus={()=>onInspect(u.id)} onBlur={()=>onInspect(null)}>
    {dusty&&<span className="dust-trail" style={{transform:`translate(-50%,-50%) rotate(${u.facing}deg)`}} aria-hidden="true"><i/><i/><i/></span>}
    <SoldierFormation unit={u} routing={routing} fighting={u.charging||u.attackTarget!==null} firing={u.kind==='Archers'&&u.attackTarget!==null&&u.ammo>0&&!moving&&!u.holdFire} frontage={formationRadius(u)*26}/>
    <span className="token-facing" style={{transform:`translate(-50%,-50%) rotate(${u.facing}deg)`}} aria-hidden="true">➤</span>
    <span className="token-badge"><span aria-hidden="true">{kindIcon(u.kind)}</span><b>{number}</b></span>
    {rallied&&<span className="rally-ribbon" aria-hidden="true">RALLIED</span>}<span className="token-name">{u.name}</span><span className="token-count">{routing?'ROUT':`${u.men} men`}</span>
  </button>;
}

export function BattleInspector({unit:u,context,canAttack,onAttack,onClose}:{unit:BattleUnit|null;context:BattleContext;canAttack:boolean;onAttack:()=>void;onClose:()=>void}){
  if(!u)return <section className="battle-inspector empty" aria-label="Unit information"><strong>Know your formations</strong><p>⚔ Infantry · ♜ Spears · ♞ Cavalry · ➶ Missiles. Select your troops, then tap an enemy to attack. With nothing selected, tap an enemy to inspect it. Hover to preview unit details.</p></section>;
  const def=unitDefinition(u.key)!,feature=battlefieldFeatureAt(context.terrain,u.x,u.y);
  return <section className={`battle-inspector ${u.side}`} aria-label="Unit information">
    <div className="inspector-title"><UnitPortrait kind={u.kind} unitKey={u.key} side={u.side}/><div><small>{u.side==='rome'?'YOUR UNIT':'ENEMY UNIT'} · {u.kind}</small><strong>{u.name}</strong></div><button aria-label="Close unit information" onClick={onClose}>×</button></div>
    <dl><div><dt>Soldiers</dt><dd>{u.men}/{u.maxMen}</dd></div><div><dt>Morale</dt><dd>{Math.round(u.morale)}</dd></div><div><dt>Fatigue</dt><dd>{Math.round(u.stamina)}%</dd></div>{u.kind==='Archers'&&<div><dt>Ammo</dt><dd>{u.ammo}</dd></div>}<div><dt>Order</dt><dd>{u.withdrawn?'Withdrawn':u.morale<moraleRule('rout_threshold')?'Routing':u.order}</dd></div><div><dt>Formation</dt><dd>{u.formation}</dd></div></dl>
    <p>{moraleState(u)}{u.moraleCauses?.length?` — ${u.moraleCauses.join(' · ')}`:''}</p>
    <p>{def.note} · {feature}: {terrainRule(feature).note}</p>
    {u.side==='carthage'&&<button className="inspect-attack" disabled={!canAttack} onClick={onAttack}>{canAttack?'Attack target with selected units':'Attack requires selected troops and an active battle'}</button>}
  </section>;
}
