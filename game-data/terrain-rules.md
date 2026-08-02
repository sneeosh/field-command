# Battlefield Terrain

These multipliers are applied whenever a cohort occupies the matching terrain. Values below `1` are penalties; values above `1` are bonuses. `incomingDamage` changes damage received, while `visibility` changes the range at which enemies can target the cohort.

| key | movement | melee | missile | incomingDamage | fatigue | visibility | note |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Open | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | No cover or movement penalty |
| Road | 1.25 | 1.00 | 1.00 | 1.00 | 0.78 | 1.00 | Fast marching with lower fatigue |
| Hill | 0.76 | 1.08 | 1.18 | 0.82 | 1.28 | 1.00 | High ground strengthens attacks and defense |
| Forest | 0.68 | 0.94 | 0.72 | 0.84 | 1.18 | 0.68 | Trees conceal troops but disrupt movement and missiles |
| River | 0.38 | 0.68 | 0.55 | 1.32 | 1.55 | 0.80 | Fording troops are slow, exposed, and exhausted |
| Bridge | 0.78 | 0.90 | 0.85 | 1.18 | 1.25 | 0.90 | A safer crossing that still creates a deadly choke point |
