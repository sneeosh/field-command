import { theaterDefinition, theaterRoutes } from './game-content.ts';
import type { Campaign } from './game-types.ts';

/** Evaluate the positions after planned marches, before committing a turn. */
export function capitalWarning(c:Campaign):string|null {
  const capital=c.cities.find(city=>city.id===theaterDefinition(c.theater).capitalCity);
  if(!capital||capital.owner!=='rome')return null;
  const threats=c.armies.filter(a=>a.side==='carthage'&&a.units.some(u=>u.men>0)&&theaterRoutes(c.theater).some(r=>(r.from===a.cityId&&r.to===capital.id)||(r.to===a.cityId&&r.from===capital.id)));
  if(!threats.length)return null;
  const defenders=capital.garrison.reduce((n,u)=>n+u.men,0)+c.armies.filter(a=>a.side==='rome'&&(a.targetCityId??a.cityId)===capital.id).flatMap(a=>a.units).reduce((n,u)=>n+u.men,0);
  const attack=Math.max(...threats.map(a=>a.units.reduce((n,u)=>n+u.men,0)));
  return defenders<attack*.6?`${capital.name} is exposed: ${defenders} defenders against a nearby enemy army of ${attack}. Losing your capital ends the campaign. Leave or recruit a garrison before marching away.`:null;
}
