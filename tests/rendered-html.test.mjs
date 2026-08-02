import assert from "node:assert/strict";
import test from "node:test";
import {
  battleObjective,
  battlefieldFeatureAt,
  campaignMilestone,
  claimMandateReward,
  deterministicIndex,
  hasExitedBattlefield,
  shouldSkirmish,
  splitSupplies,
} from "../lib/simulation-engine.ts";

async function render(){
  const workerUrl=new URL("../dist/server/index.js",import.meta.url);
  workerUrl.searchParams.set("test",`${process.pid}-${Date.now()}`);
  const {default:worker}=await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/",{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
}

test("renders all three campaign theaters from Markdown",async()=>{
  const response=await render(),html=await response.text();
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type")??"",/^text\/html\b/i);
  assert.match(html,/<title>Imperium: Field Command<\/title>/i);
  assert.match(html,/Italy &amp; Sicily/);
  assert.match(html,/Greece &amp; the Aegean/);
  assert.match(html,/Sengoku Japan/);
  assert.match(html,/japan-map\.png/);
  assert.doesNotMatch(html,/Your site is taking shape|codex-preview/i);
});

test("campaign milestone follows the displayed objective",()=>{
  const common={capitalHeld:true,influence:10,allies:0,turn:12,turnLimit:20,playerName:"Oda Clan"};
  assert.equal(campaignMilestone({...common,victoryPath:"Conquest",objectiveHeld:true}),"ODA CLAN VICTORY");
  assert.equal(campaignMilestone({...common,victoryPath:"Conquest",objectiveHeld:false}),null);
  assert.equal(campaignMilestone({...common,victoryPath:"Conquest",objectiveHeld:false,turn:21}),"THE CAMPAIGN MANDATE HAS EXPIRED");
  assert.equal(campaignMilestone({...common,victoryPath:"Dominion",objectiveHeld:false,influence:100,allies:2}),"DIPLOMATIC DOMINION ACHIEVED");
  assert.equal(campaignMilestone({...common,victoryPath:"Conquest",objectiveHeld:true,capitalHeld:false}),"YOUR CAPITAL HAS FALLEN");
});

test("mandate reward is one-shot durable state",()=>{
  assert.equal(claimMandateReward(false,true),true);
  assert.equal(claimMandateReward(true,true),false);
  assert.equal(claimMandateReward(false,false),false);
});

test("splitting an army conserves supplies",()=>{
  for(const total of [0,1,42,85,100]){const [original,detachment]=splitSupplies(total);assert.equal(original+detachment,total)}
});

test("battle boundary and skirmish rules prevent hidden stalemates",()=>{
  assert.equal(hasExitedBattlefield("rome",0),true);
  assert.equal(hasExitedBattlefield("rome",1),false);
  assert.equal(hasExitedBattlefield("carthage",100),true);
  assert.equal(shouldSkirmish(12,8),true);
  assert.equal(shouldSkirmish(0,8),false);
  assert.equal(shouldSkirmish(12,14),false);
});

test("battle objectives and deterministic events are stable",()=>{
  assert.equal(battleObjective(true,false),"Hold");
  assert.equal(battleObjective(false,true),"Breakthrough");
  assert.equal(battleObjective(false,false),"Rout");
  assert.equal(deterministicIndex(1560,3),deterministicIndex(1560,3));
  assert.ok(deterministicIndex(1560,3)>=0&&deterministicIndex(1560,3)<3);
});

test("battlefield terrain recognizes cover, crossings, and open ground",()=>{
  assert.equal(battlefieldFeatureAt("Hills",30,25),"Hill");
  assert.equal(battlefieldFeatureAt("Forest",31,68),"Forest");
  assert.equal(battlefieldFeatureAt("River",51,27),"Bridge");
  assert.equal(battlefieldFeatureAt("River",51,50),"River");
  assert.equal(battlefieldFeatureAt("Plains",50,80),"Road");
  assert.equal(battlefieldFeatureAt("Plains",50,50),"Open");
});
