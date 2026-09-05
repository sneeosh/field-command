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
- During combat, click ground to move or click an enemy to attack. Orders include Hold, Attack, Skirmish, Charge, and Retreat. Space pauses; changing browser tabs pauses automatically.
- Hills improve combat, woods conceal troops, and rivers slow and expose crossings. Automatic pursuit chooses bridges; explicit ground orders can ford the river. The selected-unit panel shows current modifiers.
- Eight cohorts per side deploy initially. All additional cohorts arrive in waves beginning at 25 seconds. Retreating and undeployed survivors are retained in campaign resolution where retreat is possible.
- Field battles require routing the enemy. Defense requires 120 seconds holding the left zone without enemy occupation. Assaults require 12 continuous uncontested seconds inside the breach. Battles end in withdrawal after ten simulated minutes.
- Missile volleys use ammunition; depleted missile units can fight in melee. Damage is simultaneous with fractional casualty accumulation. Movement and attacks use the same target acquisition range.

## Battle Lab

Quick battle supports Italy, Greece, and Japan; Plains, Hills, Forest, and River terrain; Clear, Rain, Fog, and Heat weather; and field, defense, or assault scenarios. Choose up to 16 cohorts for each side.

## Development checks

- `npm test`: builds the production worker and runs engine and server-render tests.
- `npm run test:engine`: runs deterministic battle, campaign, save, content, and map-layout checks without building.
- `npm run lint`: validates project code.
- `npm run typecheck`: checks the game source independently of unused starter Cloudflare bindings.

Pure simulation modules live under `lib/`; rendering and player input live under `app/`. Editable rules are in `game-data/`. Invalid Markdown updates are rejected before replacing the active definitions.

This remains a tactical prototype: units are abstract formations, terrain uses fixed regions rather than a navigation mesh, and unaccompanied city garrisons use campaign autoresolution. Saves are device-local unless exported, not cloud synchronized.
