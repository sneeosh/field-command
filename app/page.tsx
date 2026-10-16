"use client";
/* eslint-disable @next/next/no-img-element -- campaign map URLs are user-editable Markdown data */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { applyMarkdownOverrides, buildingDefinitions, contentVersion, factionDefinition, markdownDefaults, markdownLabels, moraleRule, terrainRule, theaterDefinition, theaterDefinitions, unitDefinition, unitDefinitions, type BuildingName, type Formation, type MarkdownContent, type MarkdownKey, type TerrainFeature } from "../lib/game-content";
import { BattleOverlays, BattleCommandDetails } from "./battle-command";
import { fallbackOrder, pursuitEstimate, resolvePursuit, reformUnit } from "../lib/battle-rules";
import { TacticalLessonBrief } from "./tactical-lesson";
import { BattleAudio } from "./battle-audio";
import { FieldTraining } from "./field-training";
import { BattleDialog } from "./battle-dialog";
import { BattleUnitMarker, BattleInspector } from "./battle-unit";
import { SoldierSpriteDefs } from "./soldier-sprites";
import { UnitPortrait } from "./unit-portrait";
import { FallenLayer } from "./fallen-layer";
import { ProjectileLayer } from "./projectile-layer";
import { autoDeploy, attackOrder, battleUnitNumbers } from "../lib/deployment";
import { enemyClickIntent } from "../lib/battle-interaction";
import { capitalWarning } from "../lib/campaign-warnings";
import { separateFormations, battleAnalysis } from "../lib/tactics";
import { recruitmentCost, generalEffect, supplyConnected } from "../lib/campaign-rules";
import { QuickBattleSetup, makeQuickBattle, type QuickBattleSettings } from "./quick-battle";
import { decodeSave, type SavedGame } from "../lib/save-game";
import { CampaignMap } from "./campaign-map";
import { createCampaign, evaluateCampaign, transferCohorts, conductDiplomacy, pendingEncounter, processTurn, makeEncounter, applyBattle, cityIncome, sideIncome, sideUpkeep, connected, neighbors, makeGeneral, traditionName, resolveDecision, decisionCost, campaignDate } from "../lib/campaign-engine";
import { tickBattle, initialBattleSnapshot, battleResult, deploymentPositions, HOLD_SECONDS, BREACH_SECONDS, BATTLE_STEP, distance } from "../lib/battle-engine";
import { battleObjective, battlefieldFeatureAt,  splitSupplies,  type BattlefieldTerrain } from "../lib/simulation-engine";

import type { ArmyStance, BattleOrder, City, Army, Campaign, BattleUnit, BattleContext, BattleOutcome, BattleReport, BattleSnapshot, Difficulty } from "../lib/game-types";

const tutorials=[
  "Select an army standard to inspect its general, traditions, supplies, stance, and individual cohorts.",
  "Choose a connected city and order a march. Sea routes, winter, hostile territory, and army stance consume additional supplies.",
  "Fortify to hold ground, raid to fund the campaign, or use ambush stance for a morale advantage when battle begins.",
  "Fortified cities begin a multi-turn siege. Blockade them, breach their walls, negotiate surrender, assault, or withdraw.",
  "Use gifts, trade, and alliances to earn influence and reinforcements. Dominion offers an alternative to total conquest.",
  "In battle, drag-select cohorts, create control groups with Ctrl+1–4, preserve formations, and issue attack, hold, skirmish, charge, or retreat orders.",
  "Council decisions, public order, culture, weather, seasons, and commander loyalty can change the campaign between battles.",
];
const initialCampaign=createCampaign("italy");

export default function Home(){
  const [markdown,setMarkdown]=useState<MarkdownContent>({...markdownDefaults});
  const [campaign,setCampaign]=useState<Campaign>(initialCampaign);
  const [battle,setBattle]=useState<BattleContext|null>(null);
  const [view,setView]=useState<"select"|"campaign"|"battle"|"quick">("select");
  const quickReturn=useRef<"select"|"campaign">("select");
  const [difficulty,setDifficulty]=useState<Difficulty>("Commander");
  const [quickReport,setQuickReport]=useState<BattleReport|null>(null);
  const [quick,setQuick]=useState<ReturnType<typeof makeQuickBattle>|null>(null);
  const [battleCheckpoint,setBattleCheckpoint]=useState<BattleSnapshot|null>(null);
  const [hydrated,setHydrated]=useState(false),[storageError,setStorageError]=useState("");
  const checkpoint=useRef<BattleSnapshot|null>(null);
  const importInput=useRef<HTMLInputElement>(null);
  const [notice,setNotice]=useState("Select an army, then choose a connected city.");
  const [menu,setMenu]=useState(false);
  const [confirmEnd,setConfirmEnd]=useState(false);
  const [hints,setHints]=useState(true);
  const [battleReport,setBattleReport]=useState<BattleReport|null>(null);

  const screen=quickReport||battleReport?"report":quick?"battle":view;
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});},[screen]);

  // Load rules before validating a save; never overwrite storage during hydration.
  /* eslint-disable react-hooks/set-state-in-effect -- hydrate device-local saved state after SSR */
  useEffect(()=>{
    try{
      const rules=localStorage.getItem("imperium-markdown-v2");
      if(rules){const savedRules={...markdownDefaults,...JSON.parse(rules)};applyMarkdownOverrides(savedRules);setMarkdown(savedRules)}
      const raw=localStorage.getItem("imperium-campaign-v6");
      if(raw){const saved=decodeSave(raw,contentVersion);setCampaign(saved.campaign);setBattle(saved.battle??null);setBattleCheckpoint(saved.snapshot??null);checkpoint.current=saved.snapshot??null;setBattleReport(saved.report??null);setView(saved.battle?"battle":"campaign")}
    }catch(error){setStorageError(error instanceof Error?error.message:"Could not load your saved game.")}
    setHydrated(true);
  },[]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const persist=useCallback((current:Campaign,context:BattleContext|null,report:BattleReport|null,state:BattleSnapshot|null)=>{
    try{localStorage.setItem("imperium-campaign-v6",JSON.stringify({contentVersion,campaign:current,battle:context,snapshot:state,report,savedAt:new Date().toISOString()}));setStorageError("")}
    catch{setStorageError("Device storage is full or unavailable. Export your campaign from the command menu.")}
  },[]);
  useEffect(()=>{if(hydrated&&view!=="select"&&view!=="quick"&&!quick)persist(campaign,battle,battleReport,checkpoint.current)},[campaign,battle,battleReport,view,hydrated,quick,persist]);
  const checkpointBattle=useCallback((state:BattleSnapshot)=>{
    const previous=checkpoint.current;checkpoint.current=state;
    if(!quick&&(!previous||previous.phase!==state.phase||Math.floor(previous.elapsed)!==Math.floor(state.elapsed)||state.phase==="deploy"))persist(campaign,battle,null,state);
  },[campaign,battle,quick,persist]);
  function restoreSave(saved:SavedGame){
    setCampaign(saved.campaign);setBattle(saved.battle??null);setBattleCheckpoint(saved.snapshot??null);checkpoint.current=saved.snapshot??null;setBattleReport(saved.report??null);setView(saved.battle?"battle":"campaign");setMenu(false);setStorageError("");setConfirmEnd(false);setNotice("Saved campaign restored.");
  }
  function exportSave(){
    const blob=new Blob([JSON.stringify({contentVersion,campaign,battle,snapshot:checkpoint.current,report:battleReport,savedAt:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`imperium-${campaign.theater}-turn-${campaign.turn}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importSave(file:File|undefined){
    if(!file)return;
    try{if(file.size>5_000_000)throw new Error("Save files must be smaller than 5 MB.");restoreSave(decodeSave(await file.text(),contentVersion))}
    catch(error){setStorageError(error instanceof Error?error.message:"Could not import the save.")}
  }
  function startQuick(settings:QuickBattleSettings){checkpoint.current=null;setBattleCheckpoint(null);setQuick(makeQuickBattle(settings));}

  const selectedCity=campaign.cities.find((c)=>c.id===campaign.selectedCity)??campaign.cities[0];
  const selectedArmy=campaign.armies.find((a)=>a.id===campaign.selectedArmy)??null;
  const income=sideIncome(campaign,"rome")+campaign.powers.filter((power)=>power.status==="Trade"||power.status==="Allied").length*150,upkeep=sideUpkeep(campaign,"rome");

  function chooseCity(id:number){
    setCampaign((old)=>({...old,selectedCity:id}));
    const target=campaign.cities.find((c)=>c.id===id);
    if(selectedArmy&&target&&connected(campaign.theater,selectedArmy.cityId,id)&&selectedArmy.cityId!==id)setNotice(`${target.name} is within one turn's march.`);
  }
  function chooseArmy(id:number){const army=campaign.armies.find((a)=>a.id===id);if(!army)return;setCampaign((old)=>({...old,selectedArmy:id,selectedCity:army.cityId}));setNotice(`${army.name}: ${army.units.length} cohorts ready.`)}
  function orderMarch(cityId:number){if(!selectedArmy||!selectedArmy.units.length||selectedArmy.side!=="rome"||selectedArmy.supplies<=0||!connected(campaign.theater,selectedArmy.cityId,cityId))return;setCampaign((old)=>({...old,armies:old.armies.map((a)=>a.id===selectedArmy.id?{...a,targetCityId:cityId,siegeTarget:null,siegeTurns:0}:a)}));setNotice(`${selectedArmy.name} will march when the turn ends.`);setConfirmEnd(false)}
  function queueRecruit(key:string){const def=unitDefinition(key);if(!def||!def.recruitable||def.theater!==campaign.theater||selectedCity.owner!=="rome"||campaign.treasury<recruitmentCost(campaign.theater,"rome",key)||selectedCity.recruitment.length>=3||(def.requires&&!selectedCity.buildings.includes(def.requires)))return;setCampaign((old)=>({...old,treasury:old.treasury-recruitmentCost(old.theater,"rome",key),cities:old.cities.map((c)=>c.id===selectedCity.id?{...c,recruitment:[...c.recruitment,{id:old.nextUnitId,key,turns:def.kind==="Cavalry"?3:2}]}:c),nextUnitId:old.nextUnitId+1,log:[`${def.name} recruitment begun in ${selectedCity.name}.`,...old.log].slice(0,7)}));setNotice(`${def.name} will muster in ${def.kind==="Cavalry"?3:2} turns.`)}
  function queueBuilding(name:BuildingName){const def=buildingDefinitions.find((b)=>b.name===name);if(!def||selectedCity.owner!=="rome"||campaign.treasury<def.cost||selectedCity.construction||selectedCity.buildings.includes(name))return;setCampaign((old)=>({...old,treasury:old.treasury-def.cost,cities:old.cities.map((c)=>c.id===selectedCity.id?{...c,construction:{name,turns:name==="Walls"?3:2}}:c),log:[`${name} construction begun in ${selectedCity.name}.`,...old.log].slice(0,7)}));setNotice(`${name} is now under construction.`)}
  function raiseArmy(){if(selectedCity.owner!=="rome"||!selectedCity.garrison.length)return;setCampaign((old)=>{const id=old.nextArmyId,faction=factionDefinition(theaterDefinition(old.theater).playerFaction);return{...old,nextArmyId:id+1,selectedArmy:id,armies:[...old.armies,{id,name:`${faction.short} Field Army ${romanNumeral(id-18)}`,side:"rome",cityId:selectedCity.id,targetCityId:null,movement:1,units:selectedCity.garrison,stance:"March",supplies:75,general:makeGeneral(old.theater,id),tradition:0,siegeTarget:null,siegeTurns:0}],cities:old.cities.map((c)=>c.id===selectedCity.id?{...c,garrison:[]}:c)}});setNotice("A new field army has been raised.")}
  function transfer(direction:"toArmy"|"toGarrison",ids:number[]){
    if(!selectedArmy)return;
    setCampaign(old=>transferCohorts(old,selectedArmy.id,selectedCity.id,ids,direction));
    setNotice(`Transferred ${ids.length} selected cohort(s).`);
  }
  function splitArmy(){if(!selectedArmy||selectedArmy.side!=="rome"||selectedArmy.units.length<2)return;const half=selectedArmy.units.slice(Math.ceil(selectedArmy.units.length/2)),[remainingSupplies,detachmentSupplies]=splitSupplies(selectedArmy.supplies);setCampaign((old)=>{const id=old.nextArmyId;return{...old,nextArmyId:id+1,armies:[...old.armies.map((a)=>a.id===selectedArmy.id?{...a,units:a.units.filter((u)=>!half.some((h)=>h.id===u.id)),supplies:remainingSupplies}:a),{id,name:`Detachment ${romanNumeral(id-18)}`,side:"rome",cityId:selectedArmy.cityId,targetCityId:null,movement:1,units:half,stance:"March",supplies:detachmentSupplies,general:makeGeneral(old.theater,id),tradition:Math.max(0,selectedArmy.tradition-1),siegeTarget:null,siegeTurns:0}],selectedArmy:id}})}
  function mergeArmies(){if(!selectedArmy||selectedArmy.side!=="rome")return;const allies=campaign.armies.filter((a)=>a.side==="rome"&&a.cityId===selectedArmy.cityId&&a.id!==selectedArmy.id);if(!allies.length)return;setCampaign((old)=>({...old,armies:old.armies.filter((a)=>!allies.some((b)=>b.id===a.id)).map((a)=>a.id===selectedArmy.id?{...a,units:[...a.units,...allies.flatMap((b)=>b.units)],supplies:Math.min(100,a.supplies+allies.reduce((n,b)=>n+b.supplies,0)),tradition:Math.max(a.tradition,...allies.map((b)=>b.tradition))}:a)}))}
  function setStance(stance:ArmyStance){if(!selectedArmy||selectedArmy.side!=="rome")return;setCampaign((old)=>({...old,armies:old.armies.map((a)=>a.id===selectedArmy.id?{...a,stance}:a)}));setNotice(`${selectedArmy.name} adopts ${stance.toLowerCase()} stance.`)}
  function siegeAction(action:"assault"|"negotiate"|"withdraw"){if(!selectedArmy?.siegeTarget||selectedArmy.side!=="rome")return;const city=campaign.cities.find((x)=>x.id===selectedArmy.siegeTarget);if(!city)return;if(action==="assault"){checkpoint.current=null;setBattleCheckpoint(null);const enemy=campaign.armies.find((a)=>a.side==="carthage"&&a.cityId===city.id)??null;setBattle(makeEncounter(campaign,selectedArmy,enemy,city,false));setView("battle");return}if(action==="negotiate"&&selectedArmy.siegeTurns>=2){setCampaign((old)=>evaluateCampaign({...old,influence:old.influence+8,cities:old.cities.map((x)=>x.id===city.id?{...x,owner:"rome",publicOrder:45,garrison:[],recruitment:[],construction:null}:x),armies:old.armies.filter((a)=>!(a.side==="carthage"&&a.cityId===city.id)).map((a)=>a.id===selectedArmy.id?{...a,siegeTarget:null,siegeTurns:0,tradition:Math.min(5,a.tradition+1)}:a),log:[`${city.name} surrendered after negotiation.`,...old.log]}));setNotice(`${city.name} has opened its gates.`);return}const fallback=neighbors(campaign.theater,city.id).map((id)=>campaign.cities.find((x)=>x.id===id)).find((x)=>x?.owner==="rome");if(fallback)setCampaign((old)=>({...old,armies:old.armies.map((a)=>a.id===selectedArmy.id?{...a,cityId:fallback.id,siegeTarget:null,siegeTurns:0}:a)}));setNotice("The siege has been lifted.")}
  function diplomacy(key:string,action:"gift"|"trade"|"alliance"){const next=conductDiplomacy(campaign,key,action);if(next===campaign){setNotice("That agreement is unavailable or unaffordable.");return}setCampaign(next);setNotice(next.log[0]);}

  function chooseDecision(choice:"left"|"right"){setCampaign((old)=>evaluateCampaign(resolveDecision(old,choice)));setNotice("Your decree will shape the campaign.")}
  function chooseVictory(path:"Conquest"|"Dominion"){setCampaign((old)=>evaluateCampaign({...old,victoryPath:path}));setNotice(`${path} is now the campaign strategy.`)}

  function requestEndTurn(){if(campaign.result||campaign.decision)return;const warning=capitalWarning(campaign),idle=campaign.armies.filter((a)=>a.side==="rome"&&!a.targetCityId).length;if((warning||idle)&&!confirmEnd){setConfirmEnd(true);setNotice(warning?`${warning} Press End Turn again to proceed anyway.`:`${idle} player ${idle===1?"army is":"armies are"} idle. Press End Turn again to confirm.`);return}setConfirmEnd(false);const processed=processTurn(campaign);setCampaign(processed.campaign);setNotice(processed.notice);if(processed.encounter){checkpoint.current=null;setBattleCheckpoint(null);setBattle(processed.encounter);setView("battle")}}
  function saveSlot(slot:number){try{localStorage.setItem(`imperium-save-${campaign.theater}-${slot}`,JSON.stringify({contentVersion,campaign,savedAt:new Date().toISOString()}));setNotice(`Campaign saved to slot ${slot}.`)}catch{setStorageError("Could not save. Export a campaign file instead.")}}
  function loadSlot(slot:number){try{const raw=localStorage.getItem(`imperium-save-${campaign.theater}-${slot}`);if(!raw){setNotice(`Slot ${slot} is empty.`);return}restoreSave(decodeSave(raw,contentVersion))}catch(error){setStorageError(error instanceof Error?error.message:"Could not load save.")}}

  function reset(){checkpoint.current=null;setBattleCheckpoint(null);localStorage.removeItem("imperium-campaign-v5");localStorage.removeItem("imperium-campaign-v6");setBattle(null);setBattleReport(null);setView("select");setMenu(false);setNotice("Choose a theater to begin.")}
  function startTheater(key:string){checkpoint.current=null;setBattleCheckpoint(null);setConfirmEnd(false);setCampaign(createCampaign(key,difficulty));setBattle(null);setBattleReport(null);setView("campaign");setMenu(false);setNotice("Select your field army, then choose a connected city.")}
  function updateMarkdown(next:MarkdownContent){try{applyMarkdownOverrides(next);localStorage.setItem("imperium-markdown-v2",JSON.stringify(next));setMarkdown(next);return null}catch(error){return error instanceof Error?error.message:"The Markdown could not be validated."}}
  function restoreMarkdown(){applyMarkdownOverrides(markdownDefaults);localStorage.removeItem("imperium-markdown-v1");localStorage.removeItem("imperium-markdown-v2");setMarkdown({...markdownDefaults})}
  function resolveBattle(outcome:BattleOutcome,survivors:BattleUnit[]){if(!battle)return;const result=applyBattle(campaign,battle,outcome,survivors),playerBefore=battle.units.filter((u)=>u.side==="rome").reduce((sum,u)=>sum+u.men,0)+battle.reinforcements.reduce((sum,u)=>sum+u.men,0),enemyBefore=battle.units.filter((u)=>u.side==="carthage").reduce((sum,u)=>sum+u.men,0)+(battle.enemyReinforcements??[]).reduce((sum,u)=>sum+u.men,0),playerAfter=survivors.filter((u)=>u.side==="rome"&&u.men>0).reduce((sum,u)=>sum+u.men,0)+battle.reinforcements.filter((reinforcement)=>!survivors.some((u)=>u.id===reinforcement.id)).reduce((sum,u)=>sum+u.men,0),enemyAfter=survivors.filter((u)=>u.side==="carthage"&&u.men>0).reduce((sum,u)=>sum+u.men,0)+(battle.enemyReinforcements??[]).filter(u=>!survivors.some(s=>s.id===u.id)).reduce((sum,u)=>sum+u.men,0);checkpoint.current=null;setBattleCheckpoint(null);setCampaign(result.campaign);setNotice(result.notice);setBattleReport({outcome,city:campaign.cities.find((city)=>city.id===battle.targetCityId)?.name??"the battlefield",objective:battleObjective(battle.defensive,battle.walls),playerBefore,playerAfter,enemyBefore,enemyAfter,message:result.notice,analysis:battleAnalysis(survivors,battle),honors:outcome==="VICTORY"?`${battle.general?.name??"The garrison"}${battle.general?" gains command; surviving field-army cohorts earn experience.":" held the settlement. Supporting-army casualties return to their own rosters."}`:outcome==="WITHDRAWAL"?"Surviving cohorts escaped and may replenish in friendly territory.":"The surviving army has fallen back toward friendly territory."});setBattle(null);setView("campaign")}

  if(quickReport)return <PostBattleReport report={quickReport} onContinue={()=>{setQuickReport(null);setQuick(null);setView("quick")}}/>;
  if(quick)return <BattleView key={quick.theater} theaterKey={quick.theater} context={quick.context} target={quick.target} hints={hints} onResolve={(outcome,units)=>setQuickReport({outcome,city:"Battle Lab",objective:battleObjective(quick.context.defensive,quick.context.walls),playerBefore:[...quick.context.units.filter(u=>u.side==="rome"),...quick.context.reinforcements].reduce((n,u)=>n+u.men,0),enemyBefore:[...quick.context.units.filter(u=>u.side==="carthage"),...(quick.context.enemyReinforcements??[])].reduce((n,u)=>n+u.men,0),playerAfter:[...units.filter(u=>u.side==="rome"),...quick.context.reinforcements.filter(r=>!units.some(u=>u.id===r.id))].reduce((n,u)=>n+u.men,0),enemyAfter:[...units.filter(u=>u.side==="carthage"),...(quick.context.enemyReinforcements??[]).filter(r=>!units.some(u=>u.id===r.id))].reduce((n,u)=>n+u.men,0),message:"Training battle completed. Your campaign is unchanged.",honors:"Try another formation or difficulty to compare tactics.",analysis:battleAnalysis(units,quick.context)})}/>;
  if(view==="quick")return <QuickBattleSetup onStart={startQuick} onBack={()=>setView(quickReturn.current)}/>;
  if(battleReport)return <PostBattleReport report={battleReport} onContinue={()=>{setBattleReport(null);const next=pendingEncounter(campaign);if(next){checkpoint.current=null;setBattleCheckpoint(null);setBattle(next);setView("battle")}}}/>;
  if(view==="select")return <><div className="launch-actions"><button onClick={()=>{quickReturn.current="select";setView("quick")}}>⚔ Quick battle</button><span>Custom armies · terrain · weather</span><label>Campaign difficulty <select aria-label="Campaign difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}>{["Recruit","Commander","Veteran"].map(d=><option key={d}>{d}</option>)}</select></label>{storageError&&<p role="alert">{storageError}</p>}</div><TheaterSelect markdown={markdown} onApply={updateMarkdown} onRestore={restoreMarkdown} onStart={startTheater}/></>;
  if(view==="battle"&&battle)return <BattleView theaterKey={campaign.theater} context={battle} target={campaign.cities.find((c)=>c.id===battle.targetCityId)!} hints={hints} saved={battleCheckpoint} onCheckpoint={checkpointBattle} onResolve={resolveBattle}/>;
  return <>{confirmEnd&&capitalWarning(campaign)&&<BattleDialog title="Capital at risk" onCancel={()=>setConfirmEnd(false)}><strong>Capital at risk</strong><p>{capitalWarning(campaign)}</p><div><button onClick={()=>setConfirmEnd(false)}>Review defenses</button><button onClick={requestEndTurn}>End turn anyway</button></div></BattleDialog>}{storageError&&<div className="storage-error" role="alert">{storageError}<button onClick={()=>setStorageError("")}>Dismiss</button></div>}<input ref={importInput} type="file" accept=".json,application/json" hidden onChange={e=>{void importSave(e.target.files?.[0]);e.target.value=""}}/><CampaignView campaign={campaign} city={selectedCity} army={selectedArmy} income={income} upkeep={upkeep} notice={notice} menu={menu} hints={hints} onQuick={()=>{quickReturn.current="campaign";setMenu(false);setView("quick")}} onExport={exportSave} onImport={()=>importInput.current?.click()} onMenu={()=>setMenu(!menu)} onHints={()=>setHints(!hints)} onCity={chooseCity} onArmy={chooseArmy} onMarch={orderMarch} onRecruit={queueRecruit} onBuild={queueBuilding} onRaise={raiseArmy} onTransfer={transfer} onSplit={splitArmy} onMerge={mergeArmies} onStance={setStance} onSiege={siegeAction} onDiplomacy={diplomacy} onDecision={chooseDecision} onVictory={chooseVictory} onEnd={requestEndTurn} confirmEnd={confirmEnd} onSave={saveSlot} onLoad={loadSlot} onReset={reset} onTutorial={()=>setCampaign((old)=>({...old,tutorial:Math.min(tutorials.length,old.tutorial+1)}))}/></>;
}

type ParsedMarkdownTable = { lines:string[];start:number;end:number;headers:string[];rows:string[][] };

function tableCells(line:string){return line.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map((cell)=>cell.trim())}

function parseMarkdownTable(value:string):ParsedMarkdownTable|null{
  const lines=value.split(/\r?\n/),start=lines.findIndex((line,index)=>line.trim().startsWith("|")&&index+1<lines.length&&tableCells(lines[index+1]).every((cell)=>/^:?-{3,}:?$/.test(cell)));
  if(start<0)return null;
  const headers=tableCells(lines[start]);
  let end=start+2;
  while(end<lines.length&&lines[end].trim().startsWith("|")&&lines[end].trim().endsWith("|"))end++;
  const rows=lines.slice(start+2,end).map((line)=>{const row=tableCells(line).slice(0,headers.length);while(row.length<headers.length)row.push("");return row});
  return {lines,start,end,headers,rows};
}

function serializeMarkdownTable(table:ParsedMarkdownTable,rows=table.rows){
  const clean=rows.map((row)=>table.headers.map((_,index)=>(row[index]??"").replace(/\|/g,"/").trim()));
  const widths=table.headers.map((header,index)=>Math.max(3,header.length,...clean.map((row)=>row[index].length)));
  const line=(cells:string[])=>`| ${cells.map((cell,index)=>cell.padEnd(widths[index])).join(" | ")} |`;
  const formatted=[line(table.headers),line(widths.map((width)=>"-".repeat(width))),...clean.map(line)];
  return [...table.lines.slice(0,table.start),...formatted,...table.lines.slice(table.end)].join("\n");
}

function formatMarkdownTable(value:string){const table=parseMarkdownTable(value);return table?serializeMarkdownTable(table):value}

function MarkdownTableEditor({value,onChange}:{value:string;onChange:(value:string)=>void}){
  const table=parseMarkdownTable(value);
  if(!table)return <div className="markdown-grid-empty"><strong>No Markdown table found</strong><span>Switch to Raw Markdown to edit this file.</span></div>;
  const columnWidths=table.headers.map((header,columnIndex)=>Math.min(300,Math.max(112,Math.max(header.length,...table.rows.map((row)=>(row[columnIndex]??"").length))*7+28)));
  function update(rowIndex:number,columnIndex:number,next:string){if(!table)return;const rows=table.rows.map((row)=>[...row]);rows[rowIndex][columnIndex]=next;onChange(serializeMarkdownTable(table,rows))}
  function remove(rowIndex:number){if(!table)return;onChange(serializeMarkdownTable(table,table.rows.filter((_,index)=>index!==rowIndex)))}
  function add(){if(!table)return;onChange(serializeMarkdownTable(table,[...table.rows,table.headers.map(()=>"")]))}
  return <div className="markdown-grid-editor">
    <div className="markdown-grid-summary"><span><b>{table.rows.length}</b> rows</span><span><b>{table.headers.length}</b> columns</span><em>Edit any cell directly. Scroll sideways for additional fields.</em></div>
    <div className="markdown-grid-scroll"><table className="markdown-grid">
      <colgroup><col style={{width:38}}/>{columnWidths.map((width,index)=><col key={index} style={{width}}/>)}<col style={{width:48}}/></colgroup>
      <thead><tr><th className="row-number">#</th>{table.headers.map((header)=><th key={header}>{header}</th>)}<th className="row-actions">ROW</th></tr></thead>
      <tbody>{table.rows.map((row,rowIndex)=><tr key={rowIndex}><th className="row-number">{rowIndex+1}</th>{table.headers.map((header,columnIndex)=><td key={`${header}-${columnIndex}`}><input aria-label={`${header}, row ${rowIndex+1}`} value={row[columnIndex]??""} onChange={(event)=>update(rowIndex,columnIndex,event.target.value)}/></td>)}<td className="row-actions"><button aria-label={`Delete row ${rowIndex+1}`} title="Delete row" onClick={()=>remove(rowIndex)}>×</button></td></tr>)}</tbody>
    </table></div>
    <div className="markdown-grid-toolbar"><button onClick={add}>+ ADD ROW</button><span>Changes remain Markdown and are checked when you validate.</span></div>
  </div>
}

function PostBattleReport({report,onContinue}:{report:BattleReport;onContinue:()=>void}){
  const playerLoss=Math.max(0,report.playerBefore-report.playerAfter),enemyLoss=Math.max(0,report.enemyBefore-report.enemyAfter),title=report.outcome==="VICTORY"?"FIELD TRIUMPH":report.outcome==="WITHDRAWAL"?"ORDERED WITHDRAWAL":"ARMY DEFEATED";
  return <main className={`post-battle ${report.outcome.toLowerCase()}`}><section><header><small>AFTER-ACTION REPORT · {report.city.toUpperCase()}</small><strong>{title}</strong><p>{report.message}</p></header><div className="report-objective"><span>OBJECTIVE</span><b>{report.objective}</b><em>{report.outcome==="VICTORY"?"BATTLE WON":report.outcome==="WITHDRAWAL"?"WITHDRAWN":"DEFEAT"}</em></div><div className="casualty-columns"><article><small>YOUR ARMY</small><strong>{report.playerAfter}</strong><span>soldiers remaining</span><i><b style={{width:`${report.playerAfter/Math.max(1,report.playerBefore)*100}%`}}/></i><p>−{playerLoss} casualties</p></article><div className="report-swords">⚔</div><article><small>ENEMY ARMY</small><strong>{report.enemyAfter}</strong><span>soldiers remaining</span><i><b style={{width:`${report.enemyAfter/Math.max(1,report.enemyBefore)*100}%`}}/></i><p>−{enemyLoss} casualties</p></article></div><div className="report-honors"><span>✦</span><p>{report.honors}</p></div>{report.analysis&&<section className="report-analysis"><h2>What decided the battle</h2>{report.analysis.map((line,i)=><p key={i}>{line}</p>)}</section>}<button onClick={onContinue}>{report.city==="Battle Lab"?"RETURN TO BATTLE LAB":"RETURN TO CAMPAIGN"} →</button></section></main>
}

function TheaterSelect({markdown,onApply,onRestore,onStart}:{markdown:MarkdownContent;onApply:(content:MarkdownContent)=>string|null;onRestore:()=>void;onStart:(key:string)=>void}){
  const [editing,setEditing]=useState(false),[file,setFile]=useState<MarkdownKey>("units"),[draft,setDraft]=useState<MarkdownContent>({...markdown}),[status,setStatus]=useState("Edits are stored on this device and applied to every new campaign."),[mode,setMode]=useState<"table"|"raw">("table");
  function apply(){const error=onApply(draft);setStatus(error?`Validation failed: ${error}`:"Validated and applied. New campaigns will use these rules.")}
  function setView(next:"table"|"raw"){if(next==="raw")setDraft((old)=>({...old,[file]:formatMarkdownTable(old[file])}));setMode(next)}
  return <main className="theater-select"><header><div className="brand"><span className="laurel">❧</span><div><strong>IMPERIUM</strong><small>THEATER COMMAND</small></div></div><p>Choose a campaign or rewrite its data first. Geography, factions, cities, routes, armies, economy, combat rules, and AI behavior are loaded from editable Markdown.</p><button className="open-workshop" onClick={()=>setEditing(!editing)}>{editing?"CLOSE DATA WORKSHOP":"EDIT CAMPAIGN MARKDOWN"}</button></header>{editing?<section className="markdown-workshop"><aside>{(Object.keys(markdownLabels) as MarkdownKey[]).map((key)=><button key={key} className={file===key?"active":""} onClick={()=>setFile(key)}>{markdownLabels[key]}</button>)}</aside><div><header><span><small>GAME DATA</small><strong>{markdownLabels[file]}.md</strong></span><div className="workshop-header-actions"><div className="workshop-view-toggle"><button className={mode==="table"?"active":""} onClick={()=>setView("table")}>Table</button><button className={mode==="raw"?"active":""} onClick={()=>setView("raw")}>Markdown</button></div><button onClick={()=>{onRestore();setDraft({...markdownDefaults});setStatus("Shipped Markdown restored.")}}>Restore defaults</button><button className="apply" onClick={apply}>Validate & apply</button></div></header>{mode==="table"?<MarkdownTableEditor value={draft[file]} onChange={(value)=>setDraft({...draft,[file]:value})}/>:<textarea spellCheck={false} aria-label={`${markdownLabels[file]} Markdown`} value={draft[file]} onChange={(event)=>setDraft({...draft,[file]:event.target.value})}/>}<footer className={status.startsWith("Validation failed")?"error":""}>{status}</footer></div></section>:<section className="theater-cards">{theaterDefinitions.map((t)=>{const player=factionDefinition(t.playerFaction),enemy=factionDefinition(t.enemyFaction);return <article key={t.key} style={{"--theater-color":player.color,"--theater-enemy":enemy.color} as CSSProperties}><img src={t.map} alt={`${t.name} campaign map`}/><div><small>{t.subtitle}</small><h2>{t.name}</h2><p>{t.description}</p><p className="doctrine-note">{player.doctrine}</p><dl><div><dt>COMMAND</dt><dd>{player.name}</dd></div><div><dt>OPPOSED BY</dt><dd>{enemy.name}</dd></div><div><dt>MANDATE</dt><dd>{t.turnLimit} turns</dd></div></dl><button onClick={()=>onStart(t.key)}>BEGIN {t.name.toUpperCase()} →</button></div></article>})}</section>}<footer>THEATER PACKS · LIVE MARKDOWN WORKSHOP · GRAND STRATEGY</footer></main>
}

function CampaignView(p:{campaign:Campaign;city:City;army:Army|null;income:number;upkeep:number;notice:string;menu:boolean;hints:boolean;confirmEnd:boolean;onMenu:()=>void;onHints:()=>void;onCity:(id:number)=>void;onArmy:(id:number)=>void;onMarch:(id:number)=>void;onRecruit:(key:string)=>void;onBuild:(name:BuildingName)=>void;onRaise:()=>void;onTransfer:(d:"toArmy"|"toGarrison",ids:number[])=>void;onExport:()=>void;onImport:()=>void;onQuick:()=>void;onSplit:()=>void;onMerge:()=>void;onStance:(s:ArmyStance)=>void;onSiege:(a:"assault"|"negotiate"|"withdraw")=>void;onDiplomacy:(key:string,a:"gift"|"trade"|"alliance")=>void;onDecision:(c:"left"|"right")=>void;onVictory:(v:"Conquest"|"Dominion")=>void;onEnd:()=>void;onSave:(s:number)=>void;onLoad:(s:number)=>void;onReset:()=>void;onTutorial:()=>void}){
  const {campaign:c,city,army}=p,theater=theaterDefinition(c.theater),player=factionDefinition(theater.playerFaction),enemy=factionDefinition(theater.enemyFaction),canMarch=army&&army.side==="rome"&&army.supplies>0&&army.cityId!==city.id&&connected(c.theater,army.cityId,city.id),objectiveCity=c.cities.find((x)=>x.id===theater.objectiveCity),unitsForSale=unitDefinitions.filter((u)=>u.theater===c.theater&&u.recruitable);
  const [mapExpanded,setMapExpanded]=useState(false),[cohorts,setCohorts]=useState<number[]>([]),[showGarrison,setShowGarrison]=useState(false);
  const roster=showGarrison?city.garrison:army?.units??city.garrison,selectedCohorts=cohorts.filter(id=>roster.some(u=>u.id===id));
  const theme={"--roman":player.color,"--enemy":enemy.color,"--gold":player.accent} as CSSProperties;
  return <main className={`campaign-shell theater-${c.theater}`} style={theme}>
    <header className="topbar campaign-top"><div className="brand"><span className="laurel">❧</span><div><strong>IMPERIUM</strong><small>{theater.name.toUpperCase()}</small></div></div><div className="battle-title"><strong>{player.name}</strong><span>{c.season} · {campaignDate(c)} · Turn {c.turn} · {c.influence} influence</span></div><div className="treasury"><strong>◉ {c.treasury.toLocaleString()}</strong><span className={p.income-p.upkeep>=0?"positive":"negative"}>{p.income-p.upkeep>=0?"+":""}{p.income-p.upkeep}/turn</span><button onClick={p.onEnd}>{p.confirmEnd?"CONFIRM →":"END TURN →"}</button><button className="menu-button" onClick={p.onMenu}>☰</button></div></header>
    {p.menu&&<div className="campaign-menu"><div><small>CAMPAIGN</small><strong>Command Tent</strong><p>{c.difficulty??"Commander"} difficulty · {player.doctrine}</p></div>{[1,2,3].map((s)=><span key={s}><button onClick={()=>p.onSave(s)}>Save {s}</button><button onClick={()=>p.onLoad(s)}>Load {s}</button></span>)}<button onClick={p.onHints}>Battle hints: {p.hints?"On":"Off"}</button><button onClick={p.onExport}>Export save file</button><button onClick={p.onImport}>Import save file</button><button onClick={p.onQuick}>Quick battle</button><button className="danger" onClick={p.onReset}>Choose campaign</button></div>}
    {c.tutorial<tutorials.length&&<div className="tutorial"><b>CONSUL&apos;S GUIDE {c.tutorial+1}/{tutorials.length}</b><p>{tutorials[c.tutorial]}</p><button onClick={p.onTutorial}>{c.tutorial===tutorials.length-1?"Begin campaign":"Next"}</button></div>}
    {c.decision&&<div className="campaign-decision"><small>COUNCIL DECISION</small><strong>{c.decision.title}</strong><p>{c.decision.text}</p><div><button disabled={c.treasury<decisionCost(c.decision)} onClick={()=>p.onDecision("left")}>{c.decision.left}</button><button onClick={()=>p.onDecision("right")}>{c.decision.right}</button></div></div>}
    {c.result&&<div className="campaign-result"><small>THE CHRONICLERS RECORD</small><strong>{c.result}</strong><button onClick={p.onReset}>Choose another theater</button></div>}
    <section className={`campaign-body ${mapExpanded?"map-expanded":""}`}>
      <aside className="province-panel"><div className="campaign-section-title"><small>{city.owner==="rome"?"SETTLEMENT":"HOSTILE TERRITORY"}</small><strong>{city.name}</strong><span>{city.region} · {city.owner==="rome"?player.name:enemy.name}</span></div><div className="city-stats"><div><small>POPULATION</small><strong>{city.population.toLocaleString()}</strong></div><div><small>INCOME</small><strong>+{cityIncome(city)}</strong></div><div><small>DEFENSE</small><strong>{city.defense}</strong></div><div><small>ORDER</small><strong className={city.publicOrder<35?"negative":""}>{city.publicOrder}</strong></div></div>
        {city.owner==="rome"?<><h3>CONSTRUCTION {city.construction&&`· ${city.construction.turns}T`}</h3><div className="build-list">{buildingDefinitions.map((b)=>{const built=city.buildings.includes(b.name),busy=!!city.construction;return <button key={b.name} disabled={built||busy||c.treasury<b.cost} className={built?"built":""} onClick={()=>p.onBuild(b.name)}><span>{b.icon}</span><div><strong>{b.name}</strong><small>{built?"Completed":city.construction?.name===b.name?`Building · ${city.construction.turns} turns`:b.note}</small></div><b>{built?"✓":`◉ ${b.cost}`}</b></button>})}</div></>:<div className="hostile-card"><span>⚔</span><strong>ENEMY STRONGHOLD</strong><p>Move an army here to begin a siege. Walls strengthen defenders during deployment and combat.</p></div>}
        <div className="event-log"><strong>DISPATCHES</strong>{c.log.slice(0,5).map((line,i)=><p key={i}>› {line}</p>)}</div><div className="diplomacy"><h3>DIPLOMACY</h3>{c.powers.map((power)=><div key={power.key}><span><strong>{power.name}</strong><small>{power.status} · {power.relation} relations</small></span><button disabled={power.status==="Allied"} onClick={()=>p.onDiplomacy(power.key,power.relation>=65?"alliance":power.relation>=35&&power.status!=="Trade"?"trade":"gift")}>{power.status==="Allied"?"Alliance secured":power.relation>=65?"Alliance ◉900":power.relation>=35&&power.status!=="Trade"?"Trade ◉600":"Gift ◉350"}</button></div>)}</div>
      </aside>
      <section className="campaign-center"><CampaignMap key={c.theater} campaign={c} expanded={mapExpanded} onExpand={()=>setMapExpanded(value=>!value)} onCity={p.onCity} onArmy={p.onArmy}/><div className="campaign-notice"><span>✦</span><strong>{p.notice}</strong>{canMarch&&<button onClick={()=>p.onMarch(city.id)}>MARCH TO {city.name.toUpperCase()} →</button>}</div></section>
      <aside className="army-panel"><div className="campaign-section-title army-title"><small>{army?"SELECTED ARMY":"CITY GARRISON"}</small><strong>{army?.name??`${city.name} Garrison`}</strong><span>{(army?.units??city.garrison).reduce((s,u)=>s+u.men,0)} soldiers · {army?.targetCityId?"Marching":"Ready"}</span></div>
        {army&&<div className="general-card"><span>♛</span><div><strong>{army.general?.name??"No commander"}</strong><small>{army.general?.trait??"Unproven"} · Command {army.general?.command??0} · Loyalty {army.general?.loyalty??0}</small><em>{traditionName(army.tradition)} · {army.supplies}% supplies</em><small>{generalEffect(army.general)}</small><small>{supplyConnected(c,army.cityId,army.side)?"Supply line connected":"Supply line cut — attrition risk"}</small></div></div>}
        <div className="cohort-toolbar"><button aria-pressed={!showGarrison} onClick={()=>{setShowGarrison(false);setCohorts([])}}>Field army</button><button aria-pressed={showGarrison} onClick={()=>{setShowGarrison(true);setCohorts([])}}>Garrison ({city.garrison.length})</button></div><div className="roster">{roster.map((u)=><div className={`roster-unit ${selectedCohorts.includes(u.id)?"cohort-selected":""}`} key={u.id}><input type="checkbox" aria-label={`Select ${u.name}`} checked={selectedCohorts.includes(u.id)} onChange={()=>setCohorts(old=>old.includes(u.id)?old.filter(id=>id!==u.id):[...old,u.id])}/><UnitPortrait kind={u.kind} unitKey={u.key}/><div><strong>{u.name} {u.experience?`★${u.experience}`:""}</strong><small>{u.kind} · {u.men}/{u.maxMen}</small><i><b style={{width:`${u.men/u.maxMen*100}%`}}/></i></div><em>◉{u.upkeep}</em></div>)}{!roster.length&&<p className="empty-army">No cohorts present.</p>}</div>
        {army&&army.side==="rome"&&<><div className="stance-grid">{(["March","Fortify","Raid","Ambush"] as ArmyStance[]).map((stance)=><button key={stance} className={army.stance===stance?"active":""} onClick={()=>p.onStance(stance)}>{stance}</button>)}</div><div className="army-actions"><button onClick={()=>{p.onTransfer("toGarrison",selectedCohorts);setCohorts([])}} disabled={showGarrison||city.owner!=="rome"||army.cityId!==city.id||!selectedCohorts.length}>Garrison selected</button><button onClick={()=>{p.onTransfer("toArmy",selectedCohorts);setCohorts([])}} disabled={!showGarrison||city.owner!=="rome"||army.cityId!==city.id||!selectedCohorts.length}>Reinforce selected</button><button onClick={p.onSplit} disabled={army.units.length<2}>Split</button><button onClick={p.onMerge}>Merge</button></div>{army.siegeTarget&&<div className="siege-card"><strong>SIEGE · TURN {army.siegeTurns}</strong><small>Defense is being reduced by blockade.</small><div><button onClick={()=>p.onSiege("assault")}>Assault</button><button disabled={army.siegeTurns<2} onClick={()=>p.onSiege("negotiate")}>Demand surrender</button><button onClick={()=>p.onSiege("withdraw")}>Withdraw</button></div></div>}</>}
        {!army&&city.owner==="rome"&&city.garrison.length>0&&<button className="raise-army" onClick={p.onRaise}>RAISE FIELD ARMY</button>}
        {city.owner==="rome"&&<><h3>RECRUITMENT · {city.recruitment.length}/3</h3>{city.recruitment.map((q)=><div className="queue" key={q.id}><span>{unitDefinition(q.key)?.name}</span><b>{q.turns} turns</b></div>)}<div className="recruit-list">{unitsForSale.map((u)=>{const price=recruitmentCost(c.theater,"rome",u.key),locked=!!u.requires&&!city.buildings.includes(u.requires);return <button key={u.key} disabled={locked||c.treasury<price||city.recruitment.length>=3} onClick={()=>p.onRecruit(u.key)}><UnitPortrait kind={u.kind} unitKey={u.key}/><div><strong>{u.name}</strong><small>{locked?`Requires ${u.requires}`:`${u.men} men · 2–3 turns`}</small></div><b>◉{price}</b></button>})}</div></>}
        <div className="objective"><strong>VICTORY STRATEGY</strong><div className="victory-toggle"><button className={c.victoryPath==="Conquest"?"active":""} onClick={()=>p.onVictory("Conquest")}>Conquest</button><button className={c.victoryPath==="Dominion"?"active":""} onClick={()=>p.onVictory("Dominion")}>Dominion</button></div><p className={objectiveCity?.owner==="rome"?"done":""}>{c.victoryPath==="Conquest"?`Capture ${objectiveCity?.name} by turn ${theater.turnLimit}`:`Reach 100 influence and secure two allies (${c.influence}/100)`}</p><small>Reward: {theater.reward.toLocaleString()} denarii · Campaign mandate</small></div><div className="ledger"><p><span>City revenue</span><b>+{sideIncome(c,"rome")}</b></p><p><span>Upkeep</span><b>−{p.upkeep}</b></p><p><span>Trade</span><b>+{c.powers.filter((x)=>x.status==="Trade"||x.status==="Allied").length*150}</b></p><p className="net"><span>Net</span><b>{p.income-p.upkeep>=0?"+":""}{p.income-p.upkeep}</b></p></div>
      </aside>
    </section><footer><span>GRAND STRATEGY ENGINE · BUILD V</span><p>“Supply. Command. Conquer.”</p><span>{c.cities.filter((x)=>x.owner==="rome").length}/{c.cities.length} CITIES · {enemy.name.toUpperCase()} ◉{c.enemyTreasury}</span></footer>
  </main>
}

function BattleView({theaterKey,context,target,hints,onResolve,saved,onCheckpoint}:{theaterKey:string;context:BattleContext;target:City;hints:boolean;onResolve:(o:BattleOutcome,u:BattleUnit[])=>void;saved?:BattleSnapshot|null;onCheckpoint?:(state:BattleSnapshot)=>void}){
  const theater=theaterDefinition(theaterKey),player=factionDefinition(theater.playerFaction),enemy=factionDefinition(theater.enemyFaction);
  const objective=battleObjective(context.defensive,context.walls),objectiveTarget=objective==="Hold"?HOLD_SECONDS:objective==="Breakthrough"?BREACH_SECONDS:0;
  const [snapshot,setSnapshot]=useState<BattleSnapshot>(()=>saved??initialBattleSnapshot(context));
  const {units,elapsed,objectiveProgress,phase}=snapshot;
  const unitNumbers=battleUnitNumbers(context);
  const setUnits=(update:(old:BattleUnit[])=>BattleUnit[])=>setSnapshot(old=>({...old,units:update(old.units)}));
  const setPhase=(next:"deploy"|"fight")=>setSnapshot(old=>({...old,phase:next}));
  const [selected,setSelected]=useState<number[]>(context.units.filter(u=>u.side==="rome").slice(0,1).map(u=>u.id));
  const [paused,setPaused]=useState(true),[speed,setSpeed]=useState(1),[groups,setGroups]=useState<Record<number,number[]>>({});
  const [drag,setDrag]=useState<{sx:number;sy:number;x:number;y:number}|null>(null);
  const [log,setLog]=useState<string[]>([`${context.terrain} · ${context.weather}. Select your troops, then tap an enemy to attack. Clear selection to inspect enemies.`]);
  const [confirmWithdraw,setConfirmWithdraw]=useState(false);
  const [inspected,setInspected]=useState<number|null>(null),[hovered,setHovered]=useState<number|null>(null);
  const [training,setTraining]=useState(context.training?0:-1),[sound,setSound]=useState(false);
  const inspectorRef=useRef<HTMLDivElement>(null);
  const field=useRef<HTMLDivElement>(null),rout=moraleRule("rout_threshold");
  const audio=useRef<BattleAudio|null>(null),lastSound=useRef(0),lastRouts=useRef(0);
  useEffect(()=>{audio.current=new BattleAudio();return()=>audio.current?.close()},[]);
  useEffect(()=>{if(!sound||paused||phase!=="fight"||elapsed-lastSound.current<.6)return;lastSound.current=elapsed;const routing=units.filter(u=>u.morale<rout).length;if(routing>lastRouts.current)audio.current?.play("rout");else if(units.some(u=>u.firedMissile))audio.current?.play("missile");else if(units.some(u=>u.firedAt!=null))audio.current?.play("clash");lastRouts.current=routing;},[sound,paused,phase,elapsed,units,rout]);
  const romans=units.filter(u=>u.side==="rome"&&!u.withdrawn&&u.men>0&&u.morale>=rout),enemies=units.filter(u=>u.side==="carthage"&&!u.withdrawn&&u.men>0&&u.morale>=rout);
  const result=battleResult(snapshot,context),objectiveWon=objectiveTarget>0&&objectiveProgress+1e-6>=objectiveTarget;
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement)?.closest("input,textarea,select"))return;
      if(e.code==="Space"&&phase==="fight"){e.preventDefault();setPaused(v=>!v);return}
      if(e.key==="Escape"){setSelected([]);setConfirmWithdraw(false)}
      const num=Number(e.key);
      if(num>=1&&num<=4){e.preventDefault();if(e.ctrlKey||e.metaKey)setGroups(old=>({...old,[num]:selected}));else if(groups[num]?.length)setSelected(groups[num])}
    };
    const visibility=()=>{if(document.hidden)setPaused(true)};
    addEventListener("keydown",key);document.addEventListener("visibilitychange",visibility);
    return()=>{removeEventListener("keydown",key);document.removeEventListener("visibilitychange",visibility)};
  },[phase,selected,groups]);
  useEffect(()=>{
    if(paused||phase!=="fight"||result)return;
    const timer=setInterval(()=>setSnapshot(old=>{let next=old;for(let i=0;i<speed;i++)next=tickBattle(next,context);return next}),BATTLE_STEP*1000);
    return()=>clearInterval(timer);
  },[paused,phase,result,speed,context]);
  useEffect(()=>{onCheckpoint?.(snapshot)},[snapshot,onCheckpoint]);
  function clickField(e:React.PointerEvent){
    if(!field.current||!selected.length||result)return;
    const r=field.current.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
    if(phase==="deploy"&&(x<3||x>39.5||y<7||y>93)){setLog(old=>["Deploy inside the red deployment zone.",...old].slice(0,4));return}
    const ids=selected.filter(id=>units.some(u=>u.id===id&&u.side==="rome"&&!u.withdrawn&&u.men>0&&u.morale>=rout));
    const positions=phase==="deploy"?deploymentPositions(ids.length,x,y):ids.map((_,i)=>({x:Math.max(4,Math.min(96,x)),y:Math.max(5,Math.min(95,y+(i-(ids.length-1)/2)*5))}));
    setUnits(old=>old.map(u=>{const index=ids.indexOf(u.id);if(index<0)return u;const pos=positions[index];return {...u,...(phase==="deploy"?pos:{}),tx:pos.x,ty:pos.y,attackTarget:null,order:phase==="deploy"?(u.kind==="Archers"&&u.ammo>0?"Skirmish":u.order):"Move",charging:false}}));
    if(phase==="deploy")setTraining(v=>v===0?1:v);
    setLog(old=>[`Move order · ${ids.length} selected cohort(s).`,...old].slice(0,4));
  }
  function startDrag(e:React.PointerEvent){if(!field.current||result||(e.target as HTMLElement).closest("button"))return;e.currentTarget.setPointerCapture(e.pointerId);const r=field.current.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;setDrag({sx:x,sy:y,x,y})}
  function moveDrag(e:React.PointerEvent){if(!drag||!field.current)return;const r=field.current.getBoundingClientRect();setDrag({...drag,x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100})}
  function endDrag(e:React.PointerEvent){if(!drag)return;const moved=Math.hypot(drag.x-drag.sx,drag.y-drag.sy)>2;if(moved){const minX=Math.min(drag.sx,drag.x),maxX=Math.max(drag.sx,drag.x),minY=Math.min(drag.sy,drag.y),maxY=Math.max(drag.sy,drag.y);setSelected(units.filter((u)=>u.side==="rome"&&u.x>=minX&&u.x<=maxX&&u.y>=minY&&u.y<=maxY).map((u)=>u.id))}else clickField(e);setDrag(null)}
  function attackEnemy(u:BattleUnit){
    if(phase!=="fight"||u.side!=="carthage"||u.withdrawn||u.men<=0||u.morale<rout||result)return;
    const ready=units.filter(x=>selected.includes(x.id)&&x.side==="rome"&&x.men>0&&!x.withdrawn&&x.morale>=rout);
    if(!ready.length)return;
    setUnits(old=>old.map(x=>ready.some(r=>r.id===x.id)?{...x,attackTarget:u.id,tx:u.x,ty:u.y,formation:x.formation==="Guard"&&x.kind!=="Spears"?"Line":x.formation,order:attackOrder(x),charging:x.kind==="Cavalry"&&distance(x,u)>12}:x));
    setTraining(v=>v===3?4:v);setLog(old=>[`Attack order: ${u.name}. Missile troops will keep their distance.`,...old].slice(0,4));
  }
  function clickUnit(e:React.MouseEvent,u:BattleUnit){
    e.stopPropagation();
    if(u.side==="rome"){
      if(!u.men||u.withdrawn||u.morale<rout||result)return;
      setInspected(null);setSelected(e.shiftKey?old=>old.includes(u.id)?old.filter(id=>id!==u.id):[...old,u.id]:[u.id]);
    }else{
      const intent=enemyClickIntent(units,selected,u,phase,!!result);
      if(intent==="attack"){
        setInspected(null);setHovered(null);attackEnemy(u);return;
      }
      if(intent==="ignore"){
        if(phase==="deploy")setLog(old=>["Begin the battle before issuing attack orders. Clear selection to inspect enemies.",...old].slice(0,4));
        return;
      }
      setInspected(u.id);setHovered(null);
      if(phase==="fight")setPaused(true);
      requestAnimationFrame(()=>{if(window.matchMedia("(max-width:1050px)").matches)inspectorRef.current?.scrollIntoView({block:"nearest",behavior:"smooth"})});
    }
  }
  function arrange(){
    if(phase!=="deploy"||result)return;
    setUnits(old=>autoDeploy(old,context.terrain,true));
    setLog(old=>["Auto-deployed: infantry screen, missiles behind, cavalry on the wings. Review terrain before beginning.",...old].slice(0,4));
  }

  function face(delta:number|null){if(result)return;setUnits(old=>old.map(u=>selected.includes(u.id)?reformUnit(u,{facing:delta===null?u.facing:(u.facing+delta+360)%360,lockedFacing:delta===null?null:(u.facing+delta+360)%360}):u));setTraining(v=>v===1?2:v)}
  function frontage(width:"Narrow"|"Standard"|"Wide"){if(result)return;setUnits(old=>separateFormations(old.map(u=>selected.includes(u.id)?reformUnit(u,{width}):u),phase==="deploy"));setTraining(v=>v===2?3:v)}
  function formation(f:Formation){if(result)return;setUnits((old)=>old.map((u)=>selected.includes(u.id)?reformUnit(u,{formation:f,tx:u.x,ty:u.y}):u))}
  function order(next:BattleOrder){if(result)return;if(next==="Attack"&&phase==="fight")setTraining(v=>v===3?4:v);setUnits((old)=>old.map((u)=>{if(!selected.includes(u.id)||!u.men||u.withdrawn||u.morale<rout)return u;if(next==="Fallback")return fallbackOrder(u,old);if(next==="Hold")return{...u,order:next,tx:u.x,ty:u.y,attackTarget:null};if(next==="Retreat")return{...u,order:next,tx:-6,ty:u.y,attackTarget:null};return{...u,order:next==="Attack"&&u.kind==="Archers"&&u.ammo>0?"Skirmish":next,formation:next==="Attack"&&u.formation==="Guard"&&u.kind!=="Spears"?"Line":u.formation,charging:next==="Charge"&&u.kind==="Cavalry"}}));setLog((old)=>[`${next} order issued to ${selected.length} cohort${selected.length===1?"":"s"}.`,...old].slice(0,5));}
  const pursuit=pursuitEstimate(units);
  const inspectedUnit=units.find(u=>u.id===(hovered??inspected))??null;
  const canAttack=!!inspectedUnit&&inspectedUnit.side==="carthage"&&inspectedUnit.men>0&&!inspectedUnit.withdrawn&&inspectedUnit.morale>=rout&&phase==="fight"&&!result&&romans.some(u=>selected.includes(u.id));
  const chosen=units.find((u)=>u.id===selected[0]),chosenFeature=chosen?battlefieldFeatureAt(context.terrain,chosen.x,chosen.y) as TerrainFeature:null,chosenGround=chosenFeature?terrainRule(chosenFeature):null;
  const objectiveText=context.walls?(context.defensive?"Defend the marked capture point for 120 seconds":"Break the gate, then hold the capture point for 12 seconds"):objective==="Hold"?`Defend the left zone for ${objectiveTarget}s; enemies contest the clock`:objective==="Breakthrough"?`Hold the breach uncontested for ${objectiveTarget} continuous seconds`:"Break the enemy army's morale";
  const shots=phase==="fight"&&!paused?units.flatMap(u=>{const target=units.find(t=>t.id===u.firedAt);return target?[{id:u.id,from:u,to:target,missile:u.firedMissile}]:[]}):[];
  const clashes=shots.filter(s=>!s.missile).map(s=>({id:s.id,x:(s.from.x+s.to.x)/2,y:(s.from.y+s.to.y)/2,charge:false}));
  return <main className={`game-shell ${paused?"battle-paused":""}`} style={{"--roman":player.color,"--enemy":enemy.color,"--gold":player.accent} as CSSProperties}><header className="topbar"><div className="brand"><span className="laurel">❧</span><div><strong>IMPERIUM</strong><small>FIELD COMMAND</small></div></div><div className="battle-title"><strong>{context.defensive?"Defense of":"Battle for"} {target.name}</strong><span>{phase==="deploy"?`${context.terrain} deployment · ${context.weather}`:`${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,"0")} · ${context.weather} · ${context.walls?"Fortified":context.terrain}`}</span></div><div className="time-control">{phase==="deploy"?<button className="ready" onClick={()=>{setPhase("fight");setPaused(false)}}>BEGIN BATTLE</button>:<><button className={paused?"active":""} onClick={()=>setPaused(!paused)}>{paused?"▶":"Ⅱ"}</button>{[1,2,3].map((v)=><button key={v} className={speed===v?"active":""} onClick={()=>{setSpeed(v);setPaused(false)}}>{v}×</button>)}</>}</div></header>
    <section className="command-row"><div className="army rome"><span className="standard">{player.short}</span><strong>{romans.reduce((s,u)=>s+u.men,0)} effective</strong></div><div className="balance"><span style={{width:`${romans.reduce((s,u)=>s+u.men,0)/Math.max(1,[...romans,...enemies].reduce((s,u)=>s+u.men,0))*100}%`}}/><i/></div><div className="army carthage"><strong>{enemies.reduce((s,u)=>s+u.men,0)} effective</strong><span className="standard enemy">{enemy.icon}</span></div></section>
    <section className="battle-layout"><aside className="unit-panel"><div className="panel-head"><span>Ⅰ</span><div><strong>YOUR ARMY</strong><small>{phase.toUpperCase()}</small></div></div>{units.filter((u)=>u.side==="rome").map((u)=><button className={`unit-card ${selected.includes(u.id)?"selected":""} ${u.withdrawn||u.morale<rout||!u.men?"fallen":""}`} key={u.id} onClick={(e)=>clickUnit(e,u)}><span className="unit-symbol"><UnitPortrait kind={u.kind} unitKey={u.key} side={u.side}/><small>{unitNumbers.get(u.id)}</small></span><span className="unit-data"><strong>{u.name}</strong><small>{u.withdrawn?"Withdrawn":u.morale<rout?"Routing":`${u.formation} · Fatigue ${Math.round(u.stamina)}%`}</small><i><span style={{width:`${u.men/u.maxMen*100}%`}}/></i></span><span className="men"><b>{u.men}</b><small>{u.kind==="Archers"?`${Math.floor(u.ammo)} ammo`:`${Math.round(u.morale)} mrl`}</small></span></button>)}</aside>
      <div className="field-wrap">{context.lesson&&<TacticalLessonBrief lesson={context.lesson} units={units}/>}<div className="field-selection"><span>{selected.filter(id=>romans.some(u=>u.id===id)).length} selected</span><button onClick={()=>setSelected(romans.map(u=>u.id))}>Select all troops</button><button onClick={()=>{setSelected([]);setInspected(null);setHovered(null)}}>Clear selection</button><div className="quick-battle-orders" role="group" aria-label="Quick battle orders">{(["Hold","Skirmish","Fallback"] as BattleOrder[]).map(next=><button key={next} aria-label={`${next} selected troops`} disabled={!!result||!romans.some(u=>selected.includes(u.id))} onClick={()=>order(next)}>{next}</button>)}</div></div><div className={`battle-objective ${objective.toLowerCase()}`}><span>{objective}</span><strong>{objectiveText}</strong>{objectiveTarget>0&&<i><b style={{width:`${objectiveProgress/objectiveTarget*100}%`}}/></i>}<em>{objectiveTarget>0?`${Math.floor(objectiveProgress)}/${objectiveTarget}`:"MORALE"}</em></div><div className={`field ${phase} ${context.walls?"siege":""} terrain-${context.terrain.toLowerCase()} weather-${context.weather.toLowerCase()}`} ref={field} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={()=>setDrag(null)}><SoldierSpriteDefs/><div className="terrain-ridge ridge-one"><span>HIGH GROUND</span></div><div className="terrain-ridge ridge-two"><span>HIGH GROUND</span></div><div className="farm-lines"/><div className="road"><span>ROAD</span></div><div className="river"><span>FORD</span><i className="bridge bridge-one">BRIDGE</i><i className="bridge bridge-two">BRIDGE</i></div><div className="forest-patch grove-one">♠ ♠ ♠<br/>♠ ♠ ♠<small>WOODS</small></div><div className="forest-patch grove-two">♠ ♠ ♠<br/>♠ ♠<small>WOODS</small></div>{context.walls&&<><div className={`city-wall ${context.defensive?"friendly-wall":""}`} style={{left:`${context.defensive?35:70}%`}}>WALLS</div><div className={`siege-gate ${(snapshot.gateHealth??100)<=0?"breached":""}`} style={{left:`${context.defensive?35:70}%`}}><strong>{(snapshot.gateHealth??100)<=0?"GATE OPEN":"GATE"}</strong><span>{Math.ceil(snapshot.gateHealth??100)}%</span></div><div className="capture-point" style={{left:`${context.defensive?20:90}%`}}>⚑<span>CAPTURE</span></div></>}{objective==="Breakthrough"&&<div className="breakthrough-zone"><span>BREACH</span></div>}<div className="deployment roman-zone">{player.name.toUpperCase()} DEPLOYMENT</div><div className="deployment enemy-zone">{enemy.name.toUpperCase()} LINE</div>{drag&&<div className="selection-box" style={{left:`${Math.min(drag.sx,drag.x)}%`,top:`${Math.min(drag.sy,drag.y)}%`,width:`${Math.abs(drag.x-drag.sx)}%`,height:`${Math.abs(drag.y-drag.sy)}%`}}/>}<BattleOverlays units={units} selected={selected} context={context} snapshot={snapshot}/><svg className="combat-effects" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{shots.filter(s=>s.missile).map(s=><line key={`${s.id}-${elapsed}`} className={s.from.side} x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y}/>)}</svg>{clashes.map((clash)=><span key={clash.id} className={`clash-flash ${clash.charge?"charge":""}`} style={{left:`${clash.x}%`,top:`${clash.y}%`}}><b>⚔</b><i>✦</i></span>)}<FallenLayer units={units}/><ProjectileLayer units={units} active={phase==="fight"&&!result} paused={paused}/>{units.map(u=>u.men>0&&!u.withdrawn?<BattleUnitMarker key={u.id} unit={u} number={unitNumbers.get(u.id)??0} selected={selected.includes(u.id)} inspected={inspectedUnit?.id===u.id} onClick={clickUnit} onInspect={setHovered} enemyAction={enemyClickIntent(units,selected,u,phase,!!result)} crowded={units.some(other=>other.id!==u.id&&other.men>0&&!other.withdrawn&&Math.abs(other.x-u.x)<16&&Math.abs(other.y-u.y)<12)} detailed={inspectedUnit?.id===u.id||(selected.length===1&&selected[0]===u.id)}/>:null)}{selected.map(id=>units.find(u=>u.id===id)).filter((u):u is BattleUnit=>!!u&&!u.withdrawn&&u.men>0&&distance(u,{x:u.tx,y:u.ty})>1).map(u=><span className="destination-marker" key={u.id} style={{left:`${u.tx}%`,top:`${u.ty}%`}}>＋</span>)}<div className="terrain-legend"><b>GROUND</b>{activeTerrain(context.terrain).map((feature)=><span key={feature}><i>{terrainIcon(feature)}</i>{feature}</span>)}</div><div className="north">N<span>↑</span></div></div><div className="overlay-key">Gold dashed: movement · red: target · pale circle: maximum missile range (cover reduces it). Orders keep the current pause state.</div><div className="status-strip">{phase==="deploy"?"Use high ground and cover. Cross rivers at bridges to avoid the ford penalty.":log[0]}<kbd>1–4</kbd><span>Control groups</span><kbd>SPACE</kbd><span>Pause</span></div><div ref={inspectorRef}><BattleInspector unit={inspectedUnit} context={context} canAttack={canAttack} onAttack={()=>{if(inspectedUnit)attackEnemy(inspectedUnit)}} onClose={()=>{setInspected(null);setHovered(null)}}/></div></div>
      <aside className="orders-panel">{phase==="deploy"&&<div className="battle-briefing"><strong>Battle briefing</strong><p>{context.units.filter(u=>u.side==="rome").length} deployed + {context.reinforcements.length} reserve cohorts against {context.units.filter(u=>u.side==="carthage").length} deployed + {(context.enemyReinforcements??[]).length} reserves.</p><p>{context.garrisonOnly?"You command the city garrison. Nearby armies may reinforce.":(context.supportArmies??[]).length?"Nearby armies are committed to this battle; their losses persist.":"No nearby supporting armies."}</p><small>Reserves begin arriving at 25 seconds. Use deployment to plan your approach.</small></div>}<div className="orders-heading"><small>SELECTED UNIT</small><strong>{chosen?.name??"None"}</strong><span>{chosen?`${chosen.men} men · ${Math.round(chosen.morale)} morale · ${chosen.order}`:"—"}</span></div><BattleCommandDetails units={units} selected={selected} context={context} snapshot={snapshot} onChange={setUnits} finished={!!result}/>{chosenGround&&<div className={`terrain-readout ${chosenFeature?.toLowerCase()}`}><span>{terrainIcon(chosenFeature!)}</span><div><small>CURRENT GROUND</small><strong>{chosenFeature}</strong><p>{chosenGround.note}</p></div><dl><div><dt>MOVE</dt><dd>{modifierLabel(chosenGround.movement)}</dd></div><div><dt>ATTACK</dt><dd>{modifierLabel(chosen?.kind==="Archers"?chosenGround.missile:chosenGround.melee)}</dd></div><div><dt>DEFENSE</dt><dd>{modifierLabel(2-chosenGround.incomingDamage)}</dd></div></dl></div>}<div className="battle-options"><button onClick={()=>{void audio.current?.toggle().then(setSound).catch(()=>setLog(old=>["Audio unavailable in this browser.",...old]))}}>Sound: {sound?"On":"Off"}</button><button onClick={()=>setTraining(0)}>Training</button><small>{context.difficulty??"Commander"} AI · {(context.supportArmies??[]).length} supporting armies</small></div>{training>=0&&<FieldTraining step={training} onSkip={()=>setTraining(-1)}/>}<div className="selection-actions">{phase==="deploy"&&<button onClick={arrange}>Auto-deploy</button>}<button onClick={()=>setSelected(romans.map(u=>u.id))}>Select all</button><button onClick={()=>{setSelected([]);setInspected(null);setHovered(null)}}>Clear</button></div><div className="facing-controls"><strong>Facing · {Math.round(chosen?.facing??0)}°</strong><div><button disabled={!chosen||!!result} onClick={()=>face(-45)}>↶ 45°</button><button disabled={!chosen||!!result} onClick={()=>face(45)}>45° ↷</button><button onClick={()=>face(null)}>Auto</button></div><strong>Frontage</strong><div>{(["Narrow","Standard","Wide"] as const).map(w=><button key={w} aria-pressed={(chosen?.width??"Standard")===w} onClick={()=>frontage(w)}>{w}</button>)}</div></div><h3>FORMATION</h3><div className="formation-grid">{(["Line","Guard","Wedge"] as Formation[]).map((f)=><button key={f} className={chosen?.formation===f?"active":""} onClick={()=>formation(f)}><span>{f==="Line"?"━━":f==="Guard"?"▰":"◆"}</span><strong>{f}</strong></button>)}</div><h3>ORDERS</h3><div className="tactical-orders">{(["Attack","Hold","Skirmish","Charge","Fallback","Retreat"] as BattleOrder[]).map((next)=><button key={next} className={chosen?.order===next?"active":""} onClick={()=>order(next)}>{next}</button>)}</div>{hints&&<div className="tip"><strong>{context.general?.name??"FIELD REPORT"}</strong><p>{context.general?`${context.general.trait} commander · ${context.stance} stance. `:""}Hills improve attacks and defense. Trees provide cover. Rivers punish exposed crossings; bridges are safer choke points.</p></div>}<div className="battle-log">{log.map((x,i)=><p key={i}>{x}</p>)}</div>{<button className="wide-order withdraw" onClick={()=>{setPaused(true);setConfirmWithdraw(true)}}><span>↩</span><div><strong>WITHDRAW ARMY</strong><small>Preserve surviving cohorts</small></div></button>}</aside></section>{result&&<BattleDialog title="Battle result"><small>FIELD REPORT</small><strong>{result}</strong><p>{result==="VICTORY"?objectiveWon?"The battlefield objective is secured.":"The enemy line has broken.":result==="WITHDRAWAL"?"Your surviving cohorts escaped the field.":"Your army can fight no longer."}</p><button onClick={()=>onResolve(result,units)}>Review battle</button>{result==="VICTORY"&&<div className="pursuit-preview"><p>{pursuit.reason}</p><button disabled={!pursuit.caught} onClick={()=>onResolve(result,resolvePursuit(units))}>Commit cavalry to pursuit</button></div>}</BattleDialog>}{confirmWithdraw&&!result&&<BattleDialog title="Withdraw army" onCancel={()=>setConfirmWithdraw(false)}><strong>Leave the battlefield?</strong><p>Surviving cohorts retreat. A defended settlement will be lost.</p><div><button onClick={()=>setConfirmWithdraw(false)}>Keep fighting</button><button onClick={()=>onResolve("WITHDRAWAL",units)}>Withdraw</button></div></BattleDialog>}<footer><span>TACTICAL ENGINE · BUILD VI</span><p>“Command the ground.”</p><span>GROUPS · ORDERS · WEATHER · TERRAIN</span></footer></main>
}

function activeTerrain(terrain:BattlefieldTerrain):TerrainFeature[]{return terrain==="River"?["Open","Road","River","Bridge"]:terrain==="Hills"?["Open","Road","Hill"]:terrain==="Forest"?["Open","Road","Forest"]:["Open","Road"]}
function terrainIcon(feature:TerrainFeature){return feature==="Road"?"═":feature==="Hill"?"▲":feature==="Forest"?"♠":feature==="River"?"≋":feature==="Bridge"?"╫":"·"}
function modifierLabel(multiplier:number){const percent=Math.round((multiplier-1)*100);return percent===0?"—":`${percent>0?"+":""}${percent}%`}
function romanNumeral(n:number){return["I","II","III","IV","V","VI","VII","VIII","IX","X"][Math.min(9,Math.max(0,n-1))]??String(n)}
