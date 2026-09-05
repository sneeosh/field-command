"use client";
import { useState } from "react";
import { theaterDefinitions, unitDefinitions } from "../lib/game-content";
import type { BattleContext } from "../lib/game-types";
import { createCampaign, makeEncounter, makeRoster } from "../lib/campaign-engine";
import type { BattlefieldTerrain } from "../lib/simulation-engine";

export type QuickBattleSettings={theater:string;terrain:BattlefieldTerrain;weather:BattleContext["weather"];scenario:"Field"|"Defense"|"Assault";player:string[];enemy:string[]};

export function QuickBattleSetup({onStart,onBack}:{onStart:(settings:QuickBattleSettings)=>void;onBack:()=>void}){
  const [theater,setTheater]=useState("italy"),[terrain,setTerrain]=useState<BattlefieldTerrain>("River"),[weather,setWeather]=useState<BattleContext["weather"]>("Clear"),[scenario,setScenario]=useState<QuickBattleSettings["scenario"]>("Field");
  const roster=unitDefinitions.filter(u=>u.theater===theater);
  const defaults=(key:string)=>unitDefinitions.filter(u=>u.theater===key&&u.starter).slice(0,5).map(u=>u.key);
  const [player,setPlayer]=useState<string[]>(()=>defaults("italy")),[enemy,setEnemy]=useState<string[]>(()=>defaults("italy"));
  return <main className="quick-battle-setup"><header><small>IMPERIUM · BATTLE LAB</small><h1>Command a single battle.</h1><p>Choose the ground, build both armies, and test your tactics. Your campaign is unaffected.</p><button onClick={onBack}>← Back</button></header>
    <section className="battle-setup-options"><label>Theater<select value={theater} onChange={e=>{setTheater(e.target.value);setPlayer(defaults(e.target.value));setEnemy(defaults(e.target.value))}}>{theaterDefinitions.map(t=><option key={t.key} value={t.key}>{t.name}</option>)}</select></label>
      <label>Terrain<select value={terrain} onChange={e=>setTerrain(e.target.value as BattlefieldTerrain)}>{["Plains","Hills","Forest","River"].map(t=><option key={t}>{t}</option>)}</select></label>
      <label>Weather<select value={weather} onChange={e=>setWeather(e.target.value as BattleContext["weather"])}>{["Clear","Rain","Fog","Heat"].map(t=><option key={t}>{t}</option>)}</select></label>
      <label>Objective<select value={scenario} onChange={e=>setScenario(e.target.value as QuickBattleSettings["scenario"])}><option value="Field">Rout the enemy</option><option value="Defense">Defend the city</option><option value="Assault">Break through walls</option></select></label>
    </section>
    <section className="battle-army-builder">{(["player","enemy"] as const).map(side=>{const selected=side==="player"?player:enemy,set=side==="player"?setPlayer:setEnemy;return <article key={side}><h2>{side==="player"?"Your army":"Opposing army"}</h2><p>{selected.length}/16 cohorts · {selected.reduce((sum,key)=>sum+(unitDefinitions.find(u=>u.key===key)?.men??0),0)} soldiers</p><div className="builder-roster">{selected.map((key,i)=><button key={`${key}-${i}`} onClick={()=>set(old=>old.filter((_,index)=>index!==i))} aria-label={`Remove ${unitDefinitions.find(u=>u.key===key)?.name}`}><span>{unitDefinitions.find(u=>u.key===key)?.name}</span><b>×</b></button>)}</div><div className="builder-choices">{roster.map(u=><button key={u.key} disabled={selected.length>=16} onClick={()=>set(old=>[...old,u.key])}>+ {u.name}<small>{u.kind} · {u.men} soldiers</small></button>)}</div></article>})}</section>
    <footer><p>Eight cohorts deploy initially. Reserves arrive after 25 seconds, then in waves.</p><button disabled={!player.length||!enemy.length} onClick={()=>onStart({theater,terrain,weather,scenario,player,enemy})}>Deploy armies →</button></footer>
  </main>;
}

export function makeQuickBattle(settings:QuickBattleSettings){
  const campaign=createCampaign(settings.theater),army=campaign.armies.find(a=>a.side==="rome")!,enemy=campaign.armies.find(a=>a.side==="carthage")!;
  army.units=settings.player.map((key,i)=>makeRoster(key,100000+i,i+1));enemy.units=settings.enemy.map((key,i)=>makeRoster(key,200000+i,i+1));
  const target=campaign.cities.find(c=>c.id===(settings.scenario==="Defense"?army.cityId:enemy.cityId))!;
  const context=makeEncounter(campaign,army,enemy,target,settings.scenario==="Defense");
  return {theater:settings.theater,target,context:{...context,walls:settings.scenario!=="Field",terrain:settings.terrain,weather:settings.weather}};
}
