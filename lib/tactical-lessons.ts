import {unitDefinitions} from './game-content.ts';
import type {BattleUnit} from './game-types.ts';
export type TacticalLesson='screen'|'brace'|'flank';
export const tacticalLessons=[
  {key:'screen' as const,title:'Protect your skirmishers',hint:'Keep infantry between the cavalry and your missiles. Select missile troops to see their range. Land three volleys while preserving at least half the missile cohort.'},
  {key:'brace' as const,title:'Brace against cavalry',hint:'Select your spears, use Guard formation, face the oncoming cavalry, and Hold for two seconds. Absorb a cavalry attack on the braced front.'},
  {key:'flank' as const,title:'Turn an enemy flank',hint:'Pin the enemy with infantry. Move cavalry around the side, then attack from the flank or rear. Keep a clear run-up for charge impact.'},
];
export function lessonArmies(theater:string,lesson:TacticalLesson){
  const pick=(kind:string)=>unitDefinitions.find(u=>u.theater===theater&&u.kind===kind)?.key;
  const infantry=pick('Infantry'),spears=pick('Spears'),missiles=pick('Archers'),cavalry=pick('Cavalry');
  if(!infantry||!spears||!missiles||!cavalry)return null;
  return lesson==='screen'?{player:[infantry,infantry,missiles],enemy:[cavalry,infantry]}:lesson==='brace'?{player:[spears,spears],enemy:[cavalry,cavalry]}:{player:[infantry,infantry,cavalry],enemy:[spears,infantry]};
}
export function lessonProgress(lesson:TacticalLesson,units:BattleUnit[]){
  const ours=units.filter(u=>u.side==='rome');
  if(lesson==='screen')return ours.some(u=>u.kind==='Archers'&&(u.missileHits??0)>=3&&u.men>=u.maxMen/2);
  if(lesson==='brace')return ours.some(u=>(u.bracedHits??0)>0);
  return ours.some(u=>u.kind==='Cavalry'&&(u.flankHits??0)>0);
}
