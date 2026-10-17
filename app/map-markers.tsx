// Miniature settlements and army standards for the campaign map.
// Towns grow with population, gain walls when the Walls building stands, and the
// capital shows a temple (or a castle keep in Japan). Owner colour flies on the
// pennant; the campaign objective carries a gold star.
type Tier="village"|"town"|"city";
export function settlementTier(population:number):Tier{return population>=90000?"city":population>=45000?"town":"village"}

const HOUSES:Record<Tier,[number,number,number,number][]>={
  village:[[14,22,10,7],[26,18,9,7],[22,28,11,7]],
  town:[[10,22,9,7],[21,16,10,7],[32,21,9,7],[16,29,11,7],[29,29,10,7]],
  city:[[8,24,8,6],[17,16,9,7],[29,13,9,7],[37,22,8,7],[11,31,10,6],[24,30,9,7],[34,30,9,6],[20,23,8,6]],
};

export function SettlementMiniature({population,walls,capital,objective,japan}:{population:number;walls:boolean;capital:boolean;objective:boolean;japan:boolean}){
  const tier=settlementTier(population);
  return <svg className={`settlement-mini ${tier} ${japan?"japan":""}`} viewBox="0 0 48 44" aria-hidden="true" focusable="false">
    <ellipse cx="24" cy="30" rx="21" ry="11" className="mini-ground"/>
    {walls&&<ellipse cx="24" cy="26" rx="20.5" ry="13.5" className="mini-wall"/>}
    {HOUSES[tier].map(([x,y,w,h],i)=><g key={i}><rect x={x} y={y} width={w} height={h} className="mini-house"/><path d={`M${x} ${y+h*.45} H${x+w}`} className="mini-ridge"/></g>)}
    {capital&&(japan
      ?<g className="mini-keep"><rect x="19" y="12" width="12" height="9"/><path d="M16 12 H34 L31 8 H19 Z M18.5 8 H31.5 L29 4.5 H21 Z M21 4.5 H29 L26.5 1.5 H23.5 Z" className="mini-roof"/></g>
      :<g className="mini-temple"><path d="M17 10 L25 5 L33 10 Z" className="mini-roof"/><rect x="17.5" y="10" width="15" height="9"/><path d="M19.5 11 V18.5 M22.5 11 V18.5 M25.5 11 V18.5 M28.5 11 V18.5 M31 11 V18.5" className="mini-columns"/></g>)}
    <path d="M38 23 V6" className="mini-pole"/><path d="M38 6 L46 9 L38 12 Z" className="mini-pennant"/>
    {objective&&<path d="M8 3 L9.6 7.6 L14.4 7.6 L10.5 10.4 L12 15 L8 12.2 L4 15 L5.5 10.4 L1.6 7.6 L6.4 7.6 Z" className="mini-star"/>}
  </svg>;
}

export function ArmyStandard({emblem,count,moving}:{emblem:string;count:number;moving:boolean}){
  return <span className="army-standard">
    <span className="standard-pole"/>
    <span className="standard-banner"><b>{emblem}</b></span>
    <small>{count}</small>
    {moving&&<em aria-hidden="true">→</em>}
  </span>;
}
