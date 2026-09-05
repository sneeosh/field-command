# Imperium improvement program

This roadmap follows the September 5 reference review. Work proceeds in verified releases;
an unchecked item is not implemented or promised as part of the current release.

## 1. Battle clarity and control — implemented, awaiting public release approval

- [x] Safe, configurable ammunition fallback; explicit melee override; hold fire.
- [x] Ordered fallback, bounded pursuit, and costed post-battle pursuit.
- [x] Paths, target lines, range previews, and live order explanations.
- [x] Shared combat modifier calculation for both damage and its explanation.
- [x] Named morale states, recent causes, and limited rallying.
- [x] Bracing and measured charge run-up with visible readiness.
- [x] Three playable lessons: missile screening, bracing, flanking.
- [x] Save validation and regression coverage, desktop/mobile browser checks.

Verification and limitations: [first release QA](qa/FOUNDATIONS-2026-09-05.md).
Public version 18 remains unchanged until approval. These checks are not a full balance certification.

## 2. Ground and strategic planning

- [x] Persistent, editable city terrain rather than turn-dependent terrain selection.
- [x] Campaign AI target selection evaluates armies, reinforcements, supplies, and exposure left at home.
- [ ] True terrain-obstructed spotting shared by both sides, last-known contacts.
- [ ] Formation cohesion, turning time, and disengagement risks.
- [ ] Optional capital relocation/recovery, with explicit campaign setup rules.

## 3. Campaign depth and encounter variety

- [ ] Escort, rearguard, relief, bridge control, and encirclement scenarios.
- [ ] Siege approach, alternate breaches, and interior defense.
- [ ] City specialization with opportunity costs and supply/recruitment effects.
- [ ] Treaty duration, trust, obligations, counteroffers, and acceptance reasons.
- [ ] Cohort histories and branching commander progression.

## 4. Reproducibility and release gates

- [ ] Versioned scenario definitions editable through the Markdown workshop.
- [ ] Recorded orders, reproducible battle replays, and scenario import/export.
- [ ] Multi-policy campaign balance runs across all theaters and difficulties.
- [ ] Full human-style browser campaigns in Greece and Japan, plus Italy recheck.
- [ ] Mobile interaction, text enlargement, save migration, and accessibility checks.

## Acceptance principles

- An order must either execute or explain why it cannot; do not silently replace intent.
- Visible bonuses must come from the same calculations used by the simulation.
- AI and players obey the same tactical visibility and combat rules.
- New campaign fields need safe defaults for existing saves and strict import validation.
- Automated policy simulations are not a substitute for genuine browser playthroughs.
- Publish only validated changes, with public release approval. Preserve existing saves.
- Defer additional theaters, multiplayer, and naval combat until these foundations pass.
