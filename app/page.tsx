"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildingDefinitions, cityDefinitions, contentVersion, formationAttack, formationDefense, matchup, moraleRule, unitDefinition, unitDefinitions, type BuildingName, type Formation, type Kind, type Side } from "../lib/game-content";

type RosterUnit = { id: number; key: string; name: string; kind: Kind; men: number; maxMen: number; upkeep: number };
type City = { id: number; name: string; region: string; owner: Side; population: number; baseIncome: number; defense: number; enemyPower: number; x: number; y: number; buildings: BuildingName[]; army: RosterUnit[] };
type Unit = RosterUnit & { side: Side; morale: number; x: number; y: number; tx: number; ty: number; facing: number; formation: Formation };
type Campaign = { turn: number; year: number; treasury: number; cities: City[]; selectedCity: number; log: string[]; nextUnitId: number };

const unitCatalog = unitDefinitions.filter((unit) => unit.recruitable);
const buildingCatalog = buildingDefinitions;
let seededUnitId = 1;
const seededCities: City[] = cityDefinitions.map((city) => ({ ...city, army: city.army.map((key, index) => {
  const definition = unitDefinition(key);
  if (!definition) throw new Error(`Unknown starter unit '${key}' in ${city.name}.`);
  const id = seededUnitId++;
  return { id, key, name: `${definition.name} ${romanNumeral(city.army.slice(0, index + 1).filter((item) => item === key).length)}`, kind: definition.kind, men: definition.men, maxMen: definition.men, upkeep: definition.upkeep };
}) }));

const initialCampaign: Campaign = {
  turn: 1, year: 256, treasury: 5200, selectedCity: seededCities[0]?.id ?? 1, nextUnitId: seededUnitId + 20,
  log: ["The Senate orders the conquest of Syracuse.", "Rome begins with 5 cohorts ready for service."],
  cities: seededCities,
};

const formations: { name: Formation; icon: string; note: string }[] = [
  { name: "Line", icon: "━━", note: "Balanced front" },
  { name: "Guard", icon: "▰", note: "+30% defense" },
  { name: "Wedge", icon: "◆", note: "+25% charge" },
];

export default function Home() {
  const [view, setView] = useState<"campaign" | "battle">("campaign");
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
  const [battle, setBattle] = useState<{ units: Unit[]; targetCity: number; originCity: number } | null>(null);
  const [notice, setNotice] = useState("The Republic awaits your command.");

  useEffect(() => {
    const saved = window.localStorage.getItem("imperium-campaign-v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { contentVersion?: string; campaign?: Campaign };
        if (parsed.contentVersion === contentVersion && parsed.campaign) setCampaign(parsed.campaign);
      } catch { /* retain a clean campaign */ }
    }
  }, []);
  useEffect(() => { window.localStorage.setItem("imperium-campaign-v2", JSON.stringify({ contentVersion, campaign })); }, [campaign]);

  const city = campaign.cities.find((item) => item.id === campaign.selectedCity) ?? campaign.cities[0];
  const income = campaign.cities.filter((item) => item.owner === "rome").reduce((sum, item) => sum + cityIncome(item), 0);
  const upkeep = campaign.cities.flatMap((item) => item.army).reduce((sum, unit) => sum + unit.upkeep, 0);

  function recruit(template: typeof unitCatalog[number]) {
    if (city.owner !== "rome" || campaign.treasury < template.cost || (template.requires && !city.buildings.includes(template.requires))) return;
    setCampaign((old) => ({
      ...old, treasury: old.treasury - template.cost, nextUnitId: old.nextUnitId + 1,
      cities: old.cities.map((item) => item.id === city.id ? { ...item, army: [...item.army, { id: old.nextUnitId, key: template.key, name: `${template.name} ${romanNumeral(item.army.filter((u) => u.key === template.key).length + 1)}`, kind: template.kind, men: template.men, maxMen: template.men, upkeep: template.upkeep }] } : item),
      log: [`${template.name} recruited in ${city.name} for ${template.cost} denarii.`, ...old.log].slice(0, 6),
    }));
    setNotice(`${template.name} added to the ${city.name} field army.`);
  }

  function build(building: typeof buildingCatalog[number]) {
    if (city.owner !== "rome" || campaign.treasury < building.cost || city.buildings.includes(building.name)) return;
    setCampaign((old) => ({ ...old, treasury: old.treasury - building.cost, cities: old.cities.map((item) => item.id === city.id ? { ...item, buildings: [...item.buildings, building.name], defense: item.defense + building.defense } : item), log: [`${building.name} completed in ${city.name}.`, ...old.log].slice(0, 6) }));
    setNotice(`${building.name} completed. Its effects apply immediately.`);
  }

  function endTurn() {
    const net = income - upkeep;
    setCampaign((old) => ({
      ...old, turn: old.turn + 1, year: old.turn % 4 === 0 ? old.year - 1 : old.year, treasury: Math.max(0, old.treasury + net),
      cities: old.cities.map((item) => item.owner === "carthage" ? { ...item, enemyPower: Math.min(800, item.enemyPower + 22), population: Math.round(item.population * 1.003) } : { ...item, population: Math.round(item.population * 1.004) }),
      log: [`Turn ${old.turn} ended: ${net >= 0 ? "+" : ""}${net} denarii net revenue.`, ...old.log].slice(0, 6),
    }));
    setNotice(net >= 0 ? `The treasury gained ${net} denarii.` : `Army upkeep exceeded revenue by ${Math.abs(net)} denarii.`);
  }

  function launchBattle(target: City) {
    if (city.owner !== "rome" || target.owner !== "carthage" || !city.army.length) return;
    setBattle({ units: createBattle(city.army, target.enemyPower + target.defense), targetCity: target.id, originCity: city.id });
    setView("battle");
  }

  function resolveBattle(outcome: "VICTORY" | "DEFEAT", survivors: Unit[]) {
    if (!battle) return;
    const routThreshold = moraleRule("rout_threshold");
    const romanSurvivors = survivors.filter((unit) => unit.side === "rome" && unit.men > 0 && unit.morale >= routThreshold).map(({ id, key, name, kind, men, maxMen, upkeep }) => ({ id, key, name, kind, men, maxMen, upkeep }));
    const targetName = campaign.cities.find((item) => item.id === battle.targetCity)?.name ?? "the enemy city";
    setCampaign((old) => ({
      ...old,
      treasury: outcome === "VICTORY" ? old.treasury + 850 : old.treasury,
      selectedCity: outcome === "VICTORY" ? battle.targetCity : battle.originCity,
      cities: old.cities.map((item) => item.id === battle.originCity ? { ...item, army: outcome === "DEFEAT" ? romanSurvivors : [] } : item.id === battle.targetCity && outcome === "VICTORY" ? { ...item, owner: "rome", enemyPower: 0, army: romanSurvivors, defense: Math.max(15, item.defense - 15) } : item),
      log: [`${outcome === "VICTORY" ? `${targetName} captured; 850 denarii seized.` : `The army withdrew from ${targetName}.`}`, ...old.log].slice(0, 6),
    }));
    setNotice(outcome === "VICTORY" ? `${targetName} now answers to Rome.` : `The survivors have returned to ${city.name}.`);
    setBattle(null); setView("campaign");
  }

  return view === "campaign" ? (
    <CampaignView campaign={campaign} city={city} income={income} upkeep={upkeep} notice={notice} onSelect={(id) => setCampaign((old) => ({ ...old, selectedCity: id }))} onRecruit={recruit} onBuild={build} onEndTurn={endTurn} onBattle={launchBattle} />
  ) : battle ? <BattleView key={`${battle.originCity}-${battle.targetCity}`} initialUnits={battle.units} targetName={campaign.cities.find((item) => item.id === battle.targetCity)?.name ?? "Enemy City"} onResolve={resolveBattle} onWithdraw={() => { setBattle(null); setView("campaign"); }} /> : null;
}

function CampaignView({ campaign, city, income, upkeep, notice, onSelect, onRecruit, onBuild, onEndTurn, onBattle }: { campaign: Campaign; city: City; income: number; upkeep: number; notice: string; onSelect: (id: number) => void; onRecruit: (unit: typeof unitCatalog[number]) => void; onBuild: (building: typeof buildingCatalog[number]) => void; onEndTurn: () => void; onBattle: (city: City) => void }) {
  const nearestEnemy = campaign.cities.find((item) => item.owner === "carthage");
  return <main className="campaign-shell">
    <header className="topbar campaign-top">
      <div className="brand"><span className="laurel">❧</span><div><strong>IMPERIUM</strong><small>GRAND CAMPAIGN</small></div></div>
      <div className="battle-title"><strong>Roman Republic</strong><span>Consulship · {campaign.year} BC · Turn {campaign.turn}</span></div>
      <div className="treasury"><small>TREASURY</small><strong>◉ {campaign.treasury.toLocaleString()}</strong><span className={income - upkeep >= 0 ? "positive" : "negative"}>{income - upkeep >= 0 ? "+" : ""}{income - upkeep} / turn</span><button onClick={onEndTurn}>END TURN →</button></div>
    </header>
    <section className="campaign-body">
      <aside className="province-panel">
        <div className="campaign-section-title"><small>SETTLEMENT</small><strong>{city.name}</strong><span>{city.region} · {city.owner === "rome" ? "Roman Province" : "Hostile Territory"}</span></div>
        <div className="city-stats"><div><small>POPULATION</small><strong>{city.population.toLocaleString()}</strong></div><div><small>INCOME</small><strong>+{cityIncome(city)}</strong></div><div><small>DEFENSE</small><strong>{city.defense}</strong></div></div>
        {city.owner === "rome" ? <>
          <h3>CONSTRUCTION</h3>
          <div className="build-list">{buildingCatalog.map((building) => {
            const built = city.buildings.includes(building.name); const canBuy = !built && campaign.treasury >= building.cost;
            return <button key={building.name} disabled={!canBuy} className={built ? "built" : ""} onClick={() => onBuild(building)}><span>{buildingIcon(building.name)}</span><div><strong>{building.name}</strong><small>{built ? "Completed" : building.note}</small></div><b>{built ? "✓" : `◉ ${building.cost}`}</b></button>;
          })}</div>
        </> : <div className="hostile-card"><span>⚔</span><strong>HOSTILE CITY</strong><p>Estimated garrison: {city.enemyPower} soldiers. City defenses add {city.defense} strength.</p></div>}
      </aside>

      <section className="campaign-center">
        <div className="campaign-map" role="group" aria-label="Campaign map of Roman territories">
          <div className="sea sea-one">MARE TYRRHENUM</div><div className="sea sea-two">MARE IONIUM</div><div className="italy-land" /><div className="sicily-land" /><div className="sardinia-land" />
          <div className="map-route r1" /><div className="map-route r2" /><div className="map-route r3" /><div className="map-route r4" />
          {campaign.cities.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className={`city-node ${item.owner} ${item.id === city.id ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}><i>{item.owner === "rome" ? "Ⅰ" : "◆"}</i><strong>{item.name}</strong><small>{item.owner === "rome" ? `${item.army.length} cohorts` : `${item.enemyPower + item.defense} power`}</small></button>)}
          <div className="map-legend"><span><i className="roman-key" /> Roman</span><span><i className="enemy-key" /> Carthage</span><span>··· Roads</span></div>
        </div>
        <div className="campaign-notice"><span>✦</span><strong>{notice}</strong>{city.owner === "rome" && nearestEnemy && city.army.length > 0 && <button onClick={() => onBattle(nearestEnemy)}>MARCH ON {nearestEnemy.name.toUpperCase()} →</button>}</div>
      </section>

      <aside className="army-panel">
        <div className="campaign-section-title army-title"><small>FIELD ARMY</small><strong>{city.owner === "rome" ? `Legio ${romanNumeral(city.id)}` : "Enemy Garrison"}</strong><span>{city.army.reduce((sum, unit) => sum + unit.men, 0)} soldiers · {city.army.reduce((sum, unit) => sum + unit.upkeep, 0)} upkeep</span></div>
        {city.owner === "rome" && <>
          <div className="roster">{city.army.length ? city.army.map((unit) => <div key={unit.id} className="roster-unit"><span>{unitIcon(unit.kind)}</span><div><strong>{unit.name}</strong><small>{unit.kind} · {unit.men}/{unit.maxMen} men</small><i><b style={{ width: `${unit.men / unit.maxMen * 100}%` }} /></i></div><em>◉ {unit.upkeep}</em></div>) : <p className="empty-army">No field army stationed here.</p>}</div>
          <h3>RECRUITMENT</h3>
          <div className="recruit-list">{unitCatalog.map((unit) => {
            const locked = !!unit.requires && !city.buildings.includes(unit.requires); const poor = campaign.treasury < unit.cost;
            return <button key={unit.name} disabled={locked || poor} onClick={() => onRecruit(unit)}><span>{unitIcon(unit.kind)}</span><div><strong>{unit.name}</strong><small>{locked ? `Requires ${unit.requires}` : `${unit.men} men · ${unit.note}`}</small></div><b>◉ {unit.cost}</b></button>;
          })}</div>
        </>}
        <div className="ledger"><strong>TURN LEDGER</strong><p><span>City revenue</span><b>+{income}</b></p><p><span>Army upkeep</span><b>−{upkeep}</b></p><p className="net"><span>Net income</span><b>{income - upkeep >= 0 ? "+" : ""}{income - upkeep}</b></p></div>
      </aside>
    </section>
    <footer><span>CAMPAIGN ENGINE · BUILD II</span><p>“An empire is not built in a day.”</p><span>{campaign.cities.filter((item) => item.owner === "rome").length} OF {campaign.cities.length} CITIES UNDER ROMAN RULE</span></footer>
  </main>;
}

function BattleView({ initialUnits, targetName, onResolve, onWithdraw }: { initialUnits: Unit[]; targetName: string; onResolve: (result: "VICTORY" | "DEFEAT", survivors: Unit[]) => void; onWithdraw: () => void }) {
  const [units, setUnits] = useState(initialUnits);
  const [selected, setSelected] = useState<number[]>(initialUnits.filter((unit) => unit.side === "rome").slice(0, 1).map((unit) => unit.id));
  const [paused, setPaused] = useState(true); const [speed, setSpeed] = useState(1); const [elapsed, setElapsed] = useState(0); const [message, setMessage] = useState("Deploy your army, then begin the battle.");
  const fieldRef = useRef<HTMLDivElement>(null);
  const routThreshold = moraleRule("rout_threshold");
  const activeRomans = units.filter((u) => u.side === "rome" && u.men > 0 && u.morale >= routThreshold);
  const activeEnemies = units.filter((u) => u.side === "carthage" && u.men > 0 && u.morale >= routThreshold);
  const romanStrength = activeRomans.reduce((sum, u) => sum + u.men, 0); const enemyStrength = activeEnemies.reduce((sum, u) => sum + u.men, 0);
  const result: "VICTORY" | "DEFEAT" | null = activeRomans.length === 0 ? "DEFEAT" : activeEnemies.length === 0 ? "VICTORY" : null;

  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); setPaused((value) => !value); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  useEffect(() => {
    if (paused || result) return;
    const timer = window.setInterval(() => { setElapsed((value) => value + speed); setUnits((current) => advanceBattle(current, speed)); }, 300);
    return () => window.clearInterval(timer);
  }, [paused, speed, result]);

  function issueOrder(event: React.MouseEvent<HTMLDivElement>) {
    if (!fieldRef.current || !selected.length || result) return; const rect = fieldRef.current.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * 100; const y = (event.clientY - rect.top) / rect.height * 100;
    setUnits((old) => old.map((unit) => selected.includes(unit.id) ? { ...unit, tx: Math.max(4, Math.min(96, x)), ty: Math.max(7, Math.min(93, y + selected.indexOf(unit.id) * 3.5)), formation: unit.formation === "Guard" ? "Line" : unit.formation } : unit)); setMessage(`${selected.length} cohort${selected.length > 1 ? "s" : ""} moving.`);
  }
  function selectUnit(event: React.MouseEvent, id: number) { event.stopPropagation(); const unit = units.find((u) => u.id === id); if (!unit || unit.side !== "rome" || unit.morale < routThreshold || unit.men <= 0) return; setSelected(event.shiftKey ? (old) => old.includes(id) ? old.filter((n) => n !== id) : [...old, id] : [id]); }
  function setFormation(formation: Formation) { setUnits((old) => old.map((u) => selected.includes(u.id) ? { ...u, formation, tx: u.x, ty: u.y } : u)); setMessage(`${formation} formation ordered.`); }
  const chosen = units.find((u) => u.id === selected[0]); const mins = String(Math.floor(elapsed / 60)).padStart(2, "0"); const secs = String(elapsed % 60).padStart(2, "0");

  return <main className="game-shell">
    <header className="topbar"><div className="brand"><span className="laurel">❧</span><div><strong>IMPERIUM</strong><small>FIELD COMMAND</small></div></div><div className="battle-title"><strong>Siege of {targetName}</strong><span>{targetName} approaches · {activeRomans.length} cohorts engaged</span></div><div className="time-control"><span className="timer">{mins}:{secs}</span><button className={paused ? "active" : ""} onClick={() => setPaused((v) => !v)}>{paused ? "▶" : "Ⅱ"}</button>{[1,2,3].map((v) => <button key={v} className={speed === v ? "active" : ""} onClick={() => { setSpeed(v); setPaused(false); }}>{v}×</button>)}<button onClick={onWithdraw}>↩</button></div></header>
    <section className="command-row"><div className="army rome"><span className="standard">SPQR</span><div><small>YOUR ARMY</small><strong>Roman Republic</strong></div><b>{romanStrength}</b><em>effective</em></div><div className="balance"><span style={{ width: `${romanStrength / Math.max(1, romanStrength + enemyStrength) * 100}%` }} /><i /></div><div className="army carthage"><em>effective</em><b>{enemyStrength}</b><div><small>ENEMY ARMY</small><strong>Carthage</strong></div><span className="standard enemy">◆</span></div></section>
    <section className="battle-layout">
      <aside className="unit-panel"><div className="panel-head"><span>Ⅰ</span><div><strong>FIELD ARMY</strong><small>{targetName.toUpperCase()}</small></div></div><div className="select-note">SHIFT + SELECT FOR GROUP</div>{units.filter((u) => u.side === "rome").map((u) => <button key={u.id} className={`unit-card ${selected.includes(u.id) ? "selected" : ""} ${u.men <= 0 || u.morale < routThreshold ? "fallen" : ""}`} onClick={(e) => selectUnit(e,u.id)}><span className="unit-symbol">{unitIcon(u.kind)}</span><span className="unit-data"><strong>{u.name}</strong><small>{u.kind} · {u.morale < routThreshold ? "Routing" : u.formation}</small><i><span style={{ width: `${u.men/u.maxMen*100}%` }} /></i></span><span className="men"><b>{u.men}</b><small>{Math.round(u.morale)} MRL</small></span></button>)}</aside>
      <div className="field-wrap"><div className="field" ref={fieldRef} onClick={issueOrder} role="application" aria-label="Battlefield"><div className="terrain-ridge ridge-one"/><div className="terrain-ridge ridge-two"/><div className="farm-lines"/><div className="road"/><div className="scrub s1">♣</div><div className="scrub s2">♣</div><div className="scrub s3">♣</div><div className="deployment roman-zone">ROMAN DEPLOYMENT</div><div className="deployment enemy-zone">CARTHAGINIAN LINE</div>
        {units.map((u) => u.men > 0 && <button key={u.id} className={`formation-unit ${u.side} ${selected.includes(u.id)?"selected":""} ${u.morale<routThreshold?"routing":""} ${u.formation.toLowerCase()}`} style={{left:`${u.x}%`,top:`${u.y}%`,transform:`translate(-50%, -50%) rotate(${u.facing}deg)`}} onClick={(e)=>selectUnit(e,u.id)}><span className="flag">{u.side==="rome"?"Ⅰ":"◆"}</span><span className="soldier-row">{Array.from({length:Math.max(2,Math.ceil(u.men/u.maxMen*8))}).map((_,i)=><i key={i}/>)}</span><small>{u.men}</small></button>)}
        {selected.map((id)=>{const u=units.find((item)=>item.id===id);return u&&distancePoint(u.x,u.y,u.tx,u.ty)>1?<div key={id} className="order-marker" style={{left:`${u.tx}%`,top:`${u.ty}%`}}><span/></div>:null})}<div className="north">N<span>↑</span></div><div className="scale">100 PACES</div>{result&&<div className="result"><small>THE EAGLES REPORT</small><strong>{result}</strong><p>{result==="VICTORY"?`${targetName} is open to occupation.`:"The surviving cohorts must regroup."}</p><button onClick={(e)=>{e.stopPropagation();onResolve(result,units)}}>Return to campaign</button></div>}</div><div className="status-strip"><span className={paused?"amber-dot":"green-dot"}/>{result?`Battle concluded — ${result}`:paused?"Battle paused — issue your orders":message}<kbd>SPACE</kbd><span>Pause</span><kbd>SHIFT</kbd><span>Multi-select</span></div></div>
      <aside className="orders-panel"><div className="orders-heading"><small>SELECTED UNIT</small><strong>{chosen?.name??"No cohort"}</strong><span>{chosen?`${chosen.men} men · ${Math.round(chosen.morale)} morale`:"—"}</span></div><h3>FORMATION</h3><div className="formation-grid">{formations.map((f)=><button key={f.name} className={chosen?.formation===f.name?"active":""} onClick={()=>setFormation(f.name)}><span>{f.icon}</span><strong>{f.name}</strong><small>{f.note}</small></button>)}</div><h3>COMBAT MODEL</h3><div className="tip"><strong>TACTICAL RULES</strong><p>Damage is simultaneous. Spears counter cavalry; cavalry punish archers. Guard reduces damage, wedges increase impact, and surrounded units lose morale faster.</p></div><button className="wide-order withdraw" onClick={onWithdraw}><span>↩</span><div><strong>WITHDRAW</strong><small>Return without resolving</small></div></button></aside>
    </section><footer><span>TACTICAL ENGINE · BUILD II</span><p>“Discipline conquers fear.”</p><span>SIMULTANEOUS COMBAT · PERSISTENT LOSSES</span></footer>
  </main>;
}

function advanceBattle(current: Unit[], speed: number): Unit[] {
  const next = current.map((unit) => ({ ...unit }));
  const routThreshold = moraleRule("rout_threshold");
  for (const unit of next) {
    if (unit.men <= 0) continue;
    const stats = unitDefinition(unit.key);
    if (unit.morale < routThreshold) { unit.tx = unit.side === "rome" ? -5 : 105; unit.ty = unit.y; unit.formation = "Line"; }
    const enemies = next.filter((other) => other.side !== unit.side && other.men > 0 && other.morale >= routThreshold);
    if (!enemies.length) continue;
    const nearest = enemies.reduce((best, candidate) => distance(unit,candidate) < distance(unit,best) ? candidate : best, enemies[0]);
    const range = stats?.range ?? (unit.kind === "Archers" ? 20 : 6.2);
    if (unit.side === "carthage" && unit.morale >= routThreshold && distance(unit,nearest) > range * .88) { unit.tx = nearest.x; unit.ty = nearest.y; }
    const engaged = unit.kind !== "Archers" && distance(unit,nearest) <= range;
    const dx=unit.tx-unit.x, dy=unit.ty-unit.y, travel=Math.hypot(dx,dy); const pace=(stats?.speed ?? .86)*speed;
    if (travel>.4 && !engaged && unit.formation!=="Guard") { unit.x += dx/travel*Math.min(pace,travel); unit.y += dy/travel*Math.min(pace,travel); unit.facing=Math.atan2(dy,dx)*180/Math.PI; }
  }
  const damage = new Map<number, number>(); const moraleDamage = new Map<number, number>();
  for (const attacker of next) {
    if (attacker.men<=0 || attacker.morale<routThreshold) continue;
    const stats=unitDefinition(attacker.key); const range=stats?.range??6.4; const targets=next.filter((u)=>u.side!==attacker.side&&u.men>0&&u.morale>=routThreshold&&distance(attacker,u)<=range).sort((a,b)=>distance(attacker,a)-distance(attacker,b));
    const target=targets[0]; if(!target) continue;
    const strength=Math.max(.25,attacker.men/attacker.maxMen); const matchupBonus=matchup(attacker.kind,target.kind); const attackFormation=formationAttack(attacker.formation); const defenseFormation=formationDefense(target.formation);
    const casualties=Math.max(1,Math.round((stats?.attack??1)*strength*matchupBonus*attackFormation*defenseFormation*speed));
    damage.set(target.id,(damage.get(target.id)??0)+casualties);
    const engagedBy=next.filter((u)=>u.side===attacker.side&&u.men>0&&u.morale>=routThreshold&&distance(u,target)<7).length; moraleDamage.set(target.id,(moraleDamage.get(target.id)??0)+casualties*moraleRule("casualty")+(engagedBy>1?moraleRule("surrounded")*speed:0));
  }
  for(const unit of next){const losses=Math.min(unit.men,damage.get(unit.id)??0);unit.men-=losses;unit.morale=Math.max(0,unit.morale-(moraleDamage.get(unit.id)??0)-(unit.men<unit.maxMen*.3?.35*speed:0));}
  return next;
}

function createBattle(roster: RosterUnit[], enemyPower: number): Unit[] {
  const romans=roster.slice(0,8).map((u,i)=>({...u,side:"rome" as Side,morale:unitDefinition(u.key)?.morale??92,x:16+(i%2)*9,y:22+Math.floor(i/2)*18,tx:16+(i%2)*9,ty:22+Math.floor(i/2)*18,facing:0,formation:(u.kind==="Cavalry"?"Wedge":u.kind==="Spears"?"Guard":"Line") as Formation}));
  const kinds:Kind[]=["Spears","Infantry","Cavalry","Archers","Infantry","Spears"]; const count=Math.max(3,Math.min(6,Math.ceil(enemyPower/120))); const per=Math.max(55,Math.round(enemyPower/count));
  const enemies=Array.from({length:count},(_,i)=>{const definition=unitDefinitions.find((unit)=>unit.kind===kinds[i])??unitDefinitions[0];return {id:1000+i,key:definition.key,name:["Libyan Spears","Iberian Swords","Numidian Riders","Balearic Slingers","Sacred Band","African Infantry"][i],kind:kinds[i],men:per,maxMen:per,upkeep:0,side:"carthage" as Side,morale:definition.morale,x:76+(i%2)*8,y:24+Math.floor(i/2)*22,tx:76+(i%2)*8,ty:24+Math.floor(i/2)*22,facing:180,formation:(kinds[i]==="Cavalry"?"Wedge":"Line") as Formation};}); return [...romans,...enemies];
}
function cityIncome(city:City){return city.baseIncome+city.buildings.reduce((sum,name)=>sum+(buildingCatalog.find((b)=>b.name===name)?.income??0),0);}
function unitIcon(kind:Kind){return kind==="Cavalry"?"♞":kind==="Archers"?"➶":kind==="Spears"?"♜":"⚔";}
function buildingIcon(name:BuildingName){return buildingDefinitions.find((building)=>building.name===name)?.icon??"▦";}
function romanNumeral(n:number){return ["I","II","III","IV","V","VI","VII","VIII","IX","X"][Math.min(9,Math.max(0,n-1))];}
function distance(a:Unit,b:Unit){return Math.hypot(a.x-b.x,a.y-b.y);}
function distancePoint(ax:number,ay:number,bx:number,by:number){return Math.hypot(ax-bx,ay-by);}
