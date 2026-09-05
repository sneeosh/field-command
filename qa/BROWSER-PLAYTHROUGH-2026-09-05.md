# Browser playthrough — September 5, 2026

## Actual playthrough

Played the local game through its normal browser controls. The public saved campaign was not modified. Began a fresh Italy campaign at Commander difficulty, completed all seven tutorial steps, built Rome's walls, recruited Hastati, transferred the recruits into the field army, marched through Capua and Tarentum, resolved the council decision, and started the Syracuse blockade.

Three battles were played to their natural outcomes: victory defending Tarentum with reinforcements, victory against its depleted counterattacking army, then defeat defending Rome with only a militia cohort. The campaign ended on turn 6 with “Your capital has fallen.” No campaign or battle state was assigned through browser scripts to obtain those outcomes.

## Fixed findings

- Screen transitions retained the previous page's scroll position. New screens now start at the top.
- Formation graphics rendered over soldier counts. Explicit stacking keeps badges and counts above that artwork.
- Names/counts overlapped in close combat. Crowded tokens compact to their type and stable number; individual selection or inspection restores detail.
- Mobile selection controls required scrolling far below the map. Select-all and clear-selection controls now sit above the battlefield.
- Reports used tiny labels and overflowed horizontally on phones. Typography and container sizing were corrected. Report outcome wording no longer implies the timed objective was completed in a morale victory.
- A depleted 23-soldier enemy force immediately reattacked a 454-soldier army. Enemy armies below 45% of remaining roster capacity now recover/recruit before initiating another attack.
- The campaign did not warn that a march exposed the capital. Turn confirmation now warns about nearby enemies, planned departures/arrivals, current garrisons, and the loss condition.
- Garrison-led victories claimed a nonexistent commander received honors. The report now describes the garrison outcome accurately.
- Returning from the battle lab reopened the campaign menu. Launching the lab now closes that menu.

## Additional engine regressions addressed

Reproduced the earlier engine-audit cases with automated tests: city-derived cohort-ID collisions, generated defenders colliding with support reserves, routed cavalry following stale flanking waypoints, and negative upkeep in imported saves. Fixed these and added cross-list reserve-ID validation.

## Browser rechecks after changes

- At 390×844: final tutorial page, new-campaign scroll position, capital-risk modal, troop labels, near-map selection controls, enemy inspector, withdrawal modal, and post-battle report.
- Report measured 362px wide inside a 390px viewport; document width was also 390px (no horizontal overflow).
- Out-of-zone deployment clicks were rejected. Auto-deploy restored legal positions.
- Selected troops + enemy tap issued an attack; clear selection + enemy tap displayed details and paused combat.
- Missile units retained Skirmish orders. Recruits and supporting cohorts appeared; casualty results returned to the campaign.
- Battle lab return preserved campaign treasury and marching orders.
- Saving a slot, purchasing walls, then loading the slot restored the original treasury and construction state. Reload also restored the completed campaign correctly.
- No browser console warnings/errors were captured during the focused post-change checks.

## Limits

This is one complete Commander/Italy campaign plus focused desktop (1440×900) and phone-sized browser checks—not a balance certification or a full playthrough of Greece/Japan. Audio was not assessed. Export/import file dialogs were not exercised in the browser; save parsing and restoration have automated coverage. The loss illustrates the importance of garrisons; it does not establish that the campaign is unwinnable.

Changes are local until publication is approved and completed. The earlier engine-only report is retained as historical evidence; its listed bugs are superseded by the regression fixes above.
