# Imperium: Field Command

## Campaign controls

- Drag the campaign map to pan, or focus it and use the arrow keys. Use +/−, Fit, Focus, and Expand to adjust the view. Settlement buttons below the map locate cities even when zoomed in.
- Select an army, then a connected settlement to order a march for the next turn.
- Check individual cohorts in the Field army or Garrison roster. Transfer selected troops only when the army is at a friendly settlement. All cohorts, including garrisons, incur upkeep.
- The command menu offers local save slots and JSON import/export. Saves require the same Markdown rules that created them.
- Campaign battles are checkpointed locally during play and restored paused. Quick battles do not alter the campaign.

## Battle controls and rules

- Click a cohort to select it; Shift-click to toggle additional cohorts. Drag a box or use Select all. Ctrl/Cmd + 1–4 stores groups; 1–4 recalls them.
- During deployment, click inside the red zone to reposition selected cohorts. Entire formations are constrained to the deployment bounds.
- During combat, select your troops then click an enemy to attack; with nothing selected, click an enemy to inspect it. Click ground to move. Orders include Hold, Attack, Skirmish, Charge, Fallback, and Retreat. Space pauses; changing browser tabs pauses automatically. Issuing an order preserves the current pause state.
- Hills improve combat, woods reduce target acquisition range, and rivers slow and expose crossings. Automatic pursuit chooses bridges; explicit ground orders can ford the river. The selected-unit panel shows current modifiers. There is not yet terrain-obstructed line of sight or fog-of-war.
- Eight cohorts per side deploy initially. All additional cohorts arrive in waves beginning at 25 seconds. Retreating and undeployed survivors are retained in campaign resolution where retreat is possible.
- Field battles require routing the enemy. Defense requires 120 seconds holding the left zone without enemy occupation. Assaults require 12 continuous uncontested seconds inside the breach. Battles end in withdrawal after ten simulated minutes.
- Missile volleys use ammunition. Depleted skirmishers fall back behind friendly infantry by default, facing the enemy; choose Hold or Melee in their ammunition policy to override this. An explicit Attack with empty ammunition also permits melee. Hold fire conserves missiles but does not disable melee self-defense.
- Fallback stays inside the field; Retreat leaves it. Cohorts stop when their assigned target breaks unless Chase new targets is enabled. Post-battle pursuit requires steady cavalry below 70% fatigue and previews both enemy casualties and cavalry losses. Losses persist in campaigns; enemy survivors can retreat to a connected friendly city.
- Gold paths show movement waypoints, red lines show assigned targets, and pale range previews show maximum missile range before cover. Command feedback explains movement, reloading, gate approaches, bracing, and ammunition policies. Damage factors use the same calculation as the simulation, not estimated win odds.
- Guard spears brace after two stationary seconds in Hold, reducing frontal cavalry damage and negating charge impact. Cavalry need eight battlefield units of straight run-up, clear ground, and fatigue below 70%. Turning, reforming, or changing frontage resets readiness.
- Morale is named Steady, Wavering, Breaking, or Routing. Recent losses and exposed flanks explain morale changes. A non-routed cohort below 70 morale can rally once, gaining up to 12 morale, when no active enemy is within 14 battlefield units.
- Damage is simultaneous with fractional casualty accumulation. Movement and attacks use the same target acquisition range.

## Battle Lab

Quick battle supports Italy, Greece, and Japan; Plains, Hills, Forest, and River terrain; Clear, Rain, Fog, and Heat weather; and field, defense, or assault scenarios. Choose up to 16 cohorts for each side.

Three tactical lessons provide theater-specific armies for missile screening, spear bracing, and cavalry flanking. Their success indicators use recorded volleys, braced hits, and flank attacks; finish or withdraw from the battle to return to the Lab. Lessons do not affect your campaign.

## Persistent campaign ground

The optional `terrain` column in Cities Markdown selects Plains, Hills, Forest, or River for that settlement's battles. It no longer rotates with the campaign turn. Older custom tables without the column default to Plains. These are abstract battlefield templates, not a surveyed reconstruction of each historical site.

Enemy attack planning estimates defending troops, road reinforcements, supplies, walls, and exposure left at home. It is a target-selection heuristic, not a full strategic planner. The remaining work is tracked in [ROADMAP.md](ROADMAP.md).

## Development checks

- `npm test`: builds the production worker and runs engine and server-render tests.
- `npm run test:engine`: runs deterministic battle, campaign, save, content, and map-layout checks without building.
- `npm run lint`: validates project code.
- `npm run typecheck`: checks the game source independently of unused starter Cloudflare bindings.

Pure simulation modules live under `lib/`; rendering and player input live under `app/`. Editable rules are in `game-data/`. Invalid Markdown updates are rejected before replacing the active definitions.

This remains a tactical prototype: units use abstract formation footprints and terrain uses fixed regions rather than a navigation mesh. Saves are device-local unless exported, not cloud synchronized.

## Tactical roadmap update

- Facing arrows lock the formation's facing; Auto restores movement-facing. Front, flank, and rear attacks have distinct effects. Narrow/Standard/Wide frontage changes spacing and combat effectiveness. Overlapping active formations are separated, including at bridges.
- Recruit, Commander, and Veteran difficulty alter enemy decisions rather than soldier statistics. Tactical commanders screen missile troops, keep an early reserve, flank, and contest a threatened breach. Faction personality changes reserve timing.
- City attacks are playable even without a field army. An empty settlement musters a limited militia. Available armies in the same settlement or one connected road away reinforce; sea routes do not grant immediate support. Casualties return to each army's roster.
- Intact walls block attackers until they break the central gate. Assaults require capturing the marked point beyond the gate; defenders hold their marked point. Routing the opposing army remains an alternative victory condition.
- Faction specialties, recruitment discounts, and morale bonuses are editable in Factions Markdown. General traits affect morale, melee, logistics, and sieges. Low loyalty hurts morale. Replenishment dilutes veteran experience; unrest reflects culture and garrison presence.
- Friendly resupply requires a connected unoccupied supply route to the capital (enemy supply centers use markets). Armies cut off from supply risk attrition.
- Battle Lab includes guided, action-driven training and reports based on recorded attacks. Sound is optional, starts only after a click, and uses quiet synthesized cues for volleys, clashes, and routing.
- The previous shipped default save format upgrades automatically. Saves using custom Markdown still require matching rules.

### Validation notes

Automated checks cover battle completion at all three difficulties, formation geometry, siege gates, garrison defense, supporting army casualties, and conquest/diplomacy campaign flows in all three theaters. Campaign policy tests assume tactical victories; they are not proof that every opening strategy wins. A direct all-out attack with the starting army loses against the concentrated Greek and Japanese defenders in the simulated samples, so recruiting and managing nearby reinforcements matter. Human balance and visual playtesting remain necessary.
