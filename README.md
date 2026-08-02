# Imperium: Grand Campaign

A browser strategy game with Markdown-driven theaters, turn-based cities, economy, army movement, and AI campaigns connected to real-time tactical battles.

## Playable systems

- Independent field armies with road movement, splitting, merging, garrisoning, and reinforcement
- Named generals with traits, command, loyalty, victories, and evolving army traditions
- Supplies, seasonal attrition, sea-route costs, and march, fortify, raid, or ambush stances
- Multi-turn sieges with blockades, breaches, negotiated surrender, assaults, withdrawal, and defender sallies
- Turn-based recruitment, construction, replenishment, population costs, income, and upkeep
- Theater-aware campaign AI that recruits, attacks, captures cities, and obeys the same economy
- Diplomacy with independent powers, trade, alliances, influence, and allied reinforcements
- Tactical deployment with drag selection, Shift selection, control groups, and formation-preserving movement
- Attack, hold, skirmish, charge, and retreat orders with role-aware enemy tactics
- Procedural hills, forests, rivers, weather, reserves, walls, unit facing, flanking, fatigue, and ammunition
- Persistent casualties and experience, pursuit, withdrawal, and city capture outcomes
- Italy & Sicily as Rome against Carthage, plus Greece & the Aegean as Macedon against the Hellenic League
- Public order, culture, council decisions, story events, and conquest or diplomatic victory paths
- Autosave, three theater-specific save slots, end-turn warnings, battle hints, and a guided tutorial

## Edit the game in Markdown

The balance and campaign content live in `game-data/`:

- `units.md` — unit size, cost, upkeep, unlock, morale, attack, range, and speed
- `buildings.md` — construction cost, income, defense, icon, and description
- `cities.md` — cities, ownership, population, map position, buildings, armies, and garrison strength
- `combat-bonuses.md` — unit counters, formation modifiers, and morale rules
- `theaters.md` — campaign map, factions, capital, objective, deadline, starting economy, and description
- `factions.md` — names, standards, AI personality, and color themes
- `routes.md` — legal road and sea connections between settlements

Keep the table headings unchanged. Add or edit table rows, save, and the development game updates automatically. A production build bundles the latest Markdown values. The content engine in `lib/game-content.ts` validates numbers, names, references, and allowed values; an invalid row stops the build with a message naming the source file and field.

Players can also choose **Edit Campaign Markdown** from the theater-selection screen. The in-game workshop edits all seven files, validates the complete ruleset, stores successful changes on that device, and applies them to newly started campaigns without rebuilding the site. Shipped defaults can be restored at any time.

Campaign saves are separated by theater and tied to a fingerprint of these files. When game content changes, the browser starts a clean campaign so older saved data cannot conflict with new units or cities.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` to validate both the game and all Markdown content.
