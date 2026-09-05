import { factionDefinition, theaterDefinition, theaterRoutes, unitDefinition } from "./game-content.ts";
import type { Campaign, General } from "./game-types.ts";
import type { Side } from "./game-content.ts";

export function doctrine(theater:string,side:Side){const t=theaterDefinition(theater);return factionDefinition(side==="rome"?t.playerFaction:t.enemyFaction);}
export function recruitmentCost(theater:string,side:Side,key:string){const u=unitDefinition(key)!;const d=doctrine(theater,side);return Math.round(u.cost*(u.kind===d.specialty?d.recruitment:1));}
export function generalEffect(g:General|null){
  if(!g)return "No command bonus";
  const effects:Record<string,string>={Bold:"+8% melee attack",Cautious:"−3% attack; +8 starting morale",Logistician:"+10 resupply; −4 marching supply cost",Inspirational:"+10 starting morale", "Siege Master":"50% faster gate destruction; stronger blockade"};
  return `${effects[g.trait]??"Standard command"}${g.loyalty<40?" · Low loyalty: −8 morale":""}`;
}
export function supplyConnected(c:Campaign,cityId:number,side:Side){
  const friendly=new Set(c.cities.filter(x=>x.owner===side&&!c.armies.some(a=>a.side!==side&&a.cityId===x.id)).map(x=>x.id));
  const roots=c.cities.filter(x=>friendly.has(x.id)&&(side==="rome"?x.id===theaterDefinition(c.theater).capitalCity:x.buildings.includes("Market"))).map(x=>x.id);
  const seen=new Set(roots),queue=[...roots];
  while(queue.length){const id=queue.shift()!;for(const r of theaterRoutes(c.theater)){const n=r.from===id?r.to:r.to===id?r.from:null;if(n!==null&&friendly.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}}}
  return seen.has(cityId);
}
