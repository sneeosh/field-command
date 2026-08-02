# Imperium: Grand Campaign

A browser strategy game with Markdown-driven theaters, turn-based cities, economy, army movement, and AI campaigns connected to real-time tactical battles.

## Playable systems

- Independent field armies with road movement, splitting, merging, garrisoning, and reinforcement
- Turn-based recruitment, construction, replenishment, population costs, income, and upkeep
- Theater-aware campaign AI that recruits, attacks, captures cities, and obeys the same economy
- Tactical deployment with individual or Shift-selected cohort repositioning
- Targeted attacks, formations, unit facing, flanking, fatigue, ammunition, charges, hills, roads, and walls
- Persistent casualties and experience, pursuit, withdrawal, and city capture outcomes
- Italy & Sicily as Rome against Carthage, plus Greece & the Aegean as Macedon against the Hellenic League
- Theater-specific deadlines and objectives, dynamic events, victory and defeat states
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

Campaign saves are separated by theater and tied to a fingerprint of these files. When game content changes, the browser starts a clean campaign so older saved data cannot conflict with new units or cities.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` to validate both the game and all Markdown content.
