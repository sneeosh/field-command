"use client";
import { combatModifiers, canRally, chargeReady, commandable, missileRange, moraleState, rallyUnit, separation } from '../lib/battle-rules';
import { orderFeedback, orderPath } from '../lib/battle-feedback';
import type { BattleContext, BattleSnapshot, BattleUnit } from '../lib/game-types';

export function BattleOverlays({units,selected,context,snapshot}:{units:BattleUnit[];selected:number[];context:BattleContext;snapshot:BattleSnapshot}){
  const chosen=units.filter(u=>selected.includes(u.id)&&u.side==='rome'&&commandable(u));
  return <svg className="order-overlays" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {chosen.length===1&&chosen[0].kind==='Archers'&&chosen[0].ammo>0&&<circle className="range-preview" cx={chosen[0].x} cy={chosen[0].y} r={missileRange(chosen[0],{...chosen[0],x:0,y:0},context)}/>}
    {chosen.map(u=>{
      const target=units.find(t=>t.id===u.attackTarget&&commandable(t)),path=orderPath(u,context,snapshot.gateHealth);
      return <g key={u.id}>{separation(u,{x:u.tx,y:u.ty})>.5&&<polyline className="movement-preview" points={path.map(p=>`${p.x},${p.y}`).join(' ')}/>}{target&&<><line className="target-preview" x1={u.x} y1={u.y} x2={target.x} y2={target.y}/><circle className="target-end" cx={target.x} cy={target.y} r="2"/></>}</g>;
    })}
  </svg>;
}

export function BattleCommandDetails({units,selected,context,snapshot,onChange,finished}:{units:BattleUnit[];selected:number[];context:BattleContext;snapshot:BattleSnapshot;onChange:(fn:(units:BattleUnit[])=>BattleUnit[])=>void;finished:boolean}){
  const chosen=units.filter(u=>selected.includes(u.id)&&u.side==='rome'&&commandable(u)),u=chosen[0];
  if(!u)return null;
  const target=units.find(t=>t.id===u.attackTarget&&commandable(t)),missile=u.kind==='Archers'&&u.ammo>0&&!!target&&separation(u,target)>6.4;
  const change=(patch:Partial<BattleUnit>)=>onChange(old=>old.map(t=>chosen.some(c=>c.id===t.id)?{...t,...patch}:t));
  const missiles=chosen.filter(t=>t.kind==='Archers');
  return <section className="command-details" aria-label="Command feedback">
    <strong>{moraleState(u)} · {Math.round(u.morale)} morale</strong>
    <p className="order-explanation">{orderFeedback(u,units,context,snapshot)}</p>
    {!!u.moraleCauses?.length&&<p>Recent: {u.moraleCauses.join(' · ')}</p>}
    {u.kind==='Cavalry'&&<p>{chargeReady(u,context)?'Charge ready':`Charge run-up: ${Math.min(8,u.chargeDistance??0).toFixed(1)}/8 · needs clear ground and fatigue below 70%`}</p>}
    <fieldset disabled={finished}><legend>Selected cohorts · {chosen.length}</legend>
      {!!missiles.length&&<><label>When ammunition runs out<select value={missiles.every(t=>(t.ammoPolicy??'Fallback')===(missiles[0].ammoPolicy??'Fallback'))?missiles[0].ammoPolicy??'Fallback':'Mixed'} onChange={e=>change({ammoPolicy:e.target.value as BattleUnit['ammoPolicy']})}><option value="Mixed" disabled>Mixed</option><option value="Fallback">Fall back behind the line</option><option value="Hold">Hold position</option><option value="Melee">Engage in melee</option></select></label><button aria-pressed={missiles.every(t=>t.holdFire)} onClick={()=>change({holdFire:!missiles.every(t=>t.holdFire)})}>{missiles.every(t=>t.holdFire)?'Resume fire':'Hold fire'}</button></>}
      <button aria-pressed={chosen.every(t=>t.pursue)} onClick={()=>change({pursue:!chosen.every(t=>t.pursue)})}>Chase new targets: {chosen.every(t=>t.pursue)?'On':'Off'}</button>
      <button disabled={snapshot.phase!=='fight'||!chosen.some(t=>canRally(t,units))} onClick={()=>onChange(old=>old.map(t=>chosen.some(c=>c.id===t.id)?rallyUnit(t,old):t))}>Rally selected (+12 morale)</button>
      <small>Rally once per cohort, below 70 morale and away from enemies. Routed units cannot rally.</small>
    </fieldset>
    {target&&<details className="combat-breakdown"><summary>Against {target.name}: damage factors</summary><p>Multipliers on outgoing {missile?'missile':'melee'} damage, not win odds.</p><dl>{combatModifiers(u,target,context,missile).filter(m=>Math.abs(m.factor-1)>.001).map(m=><div key={m.label}><dt>{m.label}</dt><dd>×{m.factor.toFixed(2)}</dd></div>)}</dl></details>}
  </section>;
}
