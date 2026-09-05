import { moraleRule } from './game-content.ts';
import type { BattleUnit, BattleSnapshot } from './game-types.ts';

/** Enemy clicks issue orders whenever a commandable friendly selection exists. */
export function enemyClickIntent(units:BattleUnit[],selected:number[],target:BattleUnit,phase:BattleSnapshot['phase'],finished=false):'attack'|'inspect'|'ignore'{
  if(finished||target.side!=='carthage')return 'ignore';
  const active=(u:BattleUnit)=>u.men>0&&!u.withdrawn&&u.morale>=moraleRule('rout_threshold');
  const friendlySelection=units.filter(u=>u.side==='rome'&&selected.includes(u.id));
  if(!friendlySelection.length)return 'inspect';
  return phase==='fight'&&active(target)&&friendlySelection.some(active)?'attack':'ignore';
}
