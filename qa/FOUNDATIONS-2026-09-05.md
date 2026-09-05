# Foundations release verification — September 5, 2026

Scope: roadmap phase 1 plus persistent city terrain and campaign target-selection improvements.
Implementation is local; public deployment requires approval. Public version 18 is unchanged.

## Automated verification

- Production build and full test suite: 118 passed, zero failures.
- Engine-only command now includes all non-production-render regression files: 111 passed.
- TypeScript and ESLint checks pass.
- Regression coverage includes both-side empty-ammo behavior, Hold/Melee overrides, fallback facing, fire discipline, chase policy, frontal bracing, charge run-up, reform readiness, rally limits, exact pursuit casualties, immutable/deterministic resolution, gate/bridge feedback, malformed tactical state, default/custom save migration, city terrain validation, enemy defense estimates, and offensive enemy retreat with persistent pursuit losses.
- Existing all-theater/all-difficulty engine tests still pass. Campaign policy tests assume battle outcomes and must not be represented as human playthroughs.

## Browser verification

Environment: agent-owned localhost preview. The user's public campaign was not changed.

- Played the bracing lesson to victory through normal UI controls: selected spears, ordered Hold, began battle, then used 3× speed. The live feedback showed bracing and the lesson marked the skill demonstrated. Player survivors: 134 of 144; enemy survivors: zero of 96. Pursuit was correctly disabled without cavalry. The report returned to the Battle Lab.
- Opened the screening lesson and checked missile selection, default fallback policy, Hold policy, Hold fire/Resume fire, and beginning battle.
- Paused and clicked enemy cavalry with missiles selected: issued an attack/skirmish target without resuming time. Cleared selection and clicked the same enemy: opened enemy details without an order. Paused state remained intact.
- Checked range, target, and movement overlays in the rendered DOM and visually at desktop 1440×900 and mobile 390×844.
- Mobile document width equaled viewport width (390px). Lesson text and quick orders remained in normal layout; Hold, Skirmish, and Fallback were reachable immediately above the battlefield. Verified quick Fallback feedback and that the order preserved pause.
- Existing local campaign survived the rules-version migration and preview reload.
- No browser error logs were captured during the final inspected battle. Temporary viewport override was reset.

## Problems found and corrected during verification

- Lesson insertion broke an old child-index-dependent field grid. Replaced it with an explicit flexible field column.
- Detailed controls pushed essential orders too far down the sidebar. Added basic orders beside the field at both desktop and mobile widths.
- Fallback could leave automatic facing locked on later orders. Facing preservation now applies only while falling back and preserves deliberate manual locks.
- Manual re-forming could retain an instant brace/charge bonus. Turning, frontage, and formation edits now reset readiness.
- Empty-ammo enemy missiles could return to Attack after reaching their fallback destination. Removed that implicit transition unless melee is the chosen policy.
- Spear AI could hold indefinitely against stationary distant cavalry. It now braces against approaching attacks or immediate contact.
- Offensive victory discarded all enemy field survivors. Surviving enemies now retreat when a connected friendly city is available; pursuit can meaningfully reduce them at a cost to player cavalry.

## Explicit remaining gaps

- Flanking and screening lessons have valid rosters and simulation-backed completion conditions, but were not both played to completion through the browser in this pass.
- No complete Greece or Japan human-style browser campaign was run for this release.
- Range previews are maximum acquisition range, not terrain-obstructed line-of-sight calculations. Enemy positions remain visible.
- Terrain uses fixed templates; city assignments are design choices rather than surveyed historical terrain.
- Campaign AI changes are a local target-selection heuristic, not full strategic or diplomatic planning.
- Full enlarged-text/accessibility audit, extended campaign balance, cohesion/turning/disengagement, and the remaining campaign systems stay unchecked in ROADMAP.md.

This release should be playtested publicly before stacking the next group of mechanics on top of it.
