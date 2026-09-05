import {cityDefinitions,theaterDefinition,theaterRoutes} from './game-content.ts';
import type {Army,Campaign,City,RosterUnit} from './game-types.ts';

export function cityTerrain(cityId:number){return cityDefinitions.find(c=>c.id===cityId)?.terrain??'Plains';}
const strength=(units:RosterUnit[])=>units.reduce((n,u)=>n+u.men*(1+u.experience*.1),0);
const roadAdjacent=(c:Campaign,a:number,b:number)=>theaterRoutes(c.theater).some(r=>r.type==='road'&&(r.from===a&&r.to===b||r.to===a&&r.from===b));
/** An estimate, not an auto-resolve result. Both field armies and supporting road armies count. */
export function defenseEstimate(c:Campaign,city:City){
  const defenders=c.armies.filter(a=>a.side===city.owner&&(a.cityId===city.id||a.supplies>=20&&!a.targetCityId&&!a.siegeTarget&&roadAdjacent(c,a.cityId,city.id)));
  return strength(city.garrison)+defenders.reduce((n,a)=>n+strength(a.units),0)+city.defense*(city.buildings.includes('Walls')?3:1.5);
}
export function planAttack(c:Campaign,army:Army){
  if(army.supplies<25)return null;
  const home=c.cities.find(city=>city.id===army.cityId),routes=theaterRoutes(c.theater),capital=theaterDefinition(c.theater).capitalCity;
  const own=strength(army.units)*(.7+Math.min(100,army.supplies)/333);
  const minimum=c.difficulty==='Veteran'?.95:c.difficulty==='Recruit'?.55:.75;
  const candidates=c.cities.filter(city=>city.owner!==army.side&&routes.some(r=>r.from===army.cityId&&r.to===city.id||r.to===army.cityId&&r.from===city.id));
  const scored=candidates.map(city=>{
    const support=c.armies.filter(a=>a.id!==army.id&&a.side===army.side&&a.supplies>=20&&!a.targetCityId&&!a.siegeTarget&&(a.cityId===city.id||roadAdjacent(c,a.cityId,city.id))).reduce((n,a)=>n+strength(a.units),0);
    const defense=defenseEstimate(c,city),ratio=(own+support)/Math.max(1,defense);
    // Account for exposing the home settlement to another adjacent enemy force.
    const homeThreat=home&&home.owner===army.side?c.armies.filter(a=>a.side!==army.side&&a.cityId!==city.id&&roadAdjacent(c,a.cityId,home.id)).reduce((n,a)=>n+strength(a.units),0):0;
    const homeCover=home?strength(home.garrison)+home.defense*2+c.armies.filter(a=>a.id!==army.id&&a.side===army.side&&a.cityId===home.id).reduce((n,a)=>n+strength(a.units),0):0;
    const exposure=Math.max(0,homeThreat-homeCover);
    return {city,ratio,score:ratio*100+city.baseIncome/30+(city.id===capital?25:0)-exposure*.15};
  }).filter(p=>p.ratio>=minimum).sort((a,b)=>b.score-a.score||a.city.id-b.city.id);
  return scored[0]?.city??null;
}
