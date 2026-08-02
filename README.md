# Imperium: Grand Campaign

A browser strategy prototype with a turn-based city and economy layer connected to real-time tactical battles.

## Edit the game in Markdown

The balance and campaign content live in `game-data/`:

- `units.md` — unit size, cost, upkeep, unlock, morale, attack, range, and speed
- `buildings.md` — construction cost, income, defense, icon, and description
- `cities.md` — cities, ownership, population, map position, buildings, armies, and garrison strength
- `combat-bonuses.md` — unit counters, formation modifiers, and morale rules

Keep the table headings unchanged. Add or edit table rows, save, and the development game updates automatically. A production build bundles the latest Markdown values. The content engine in `lib/game-content.ts` validates numbers, names, references, and allowed values; an invalid row stops the build with a message naming the source file and field.

Campaign saves are tied to a fingerprint of these files. When game content changes, the browser starts a clean campaign so older saved data cannot conflict with new units or cities.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` to validate both the game and all Markdown content.
