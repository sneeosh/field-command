# Combat Rules

`matchup` rows multiply attack damage. `formation_attack` and `formation_defense` rows control formation tradeoffs. Values are multipliers.

| rule | subject | target | multiplier | note |
| --- | --- | --- | ---: | --- |
| matchup | Spears | Cavalry | 1.75 | Spears counter cavalry |
| matchup | Cavalry | Spears | 0.50 | Horses struggle against spear walls |
| matchup | Cavalry | Archers | 1.65 | Cavalry overrun exposed missiles |
| matchup | Archers | Cavalry | 0.72 | Fast targets reduce missile effect |
| formation_attack | Line | all | 1.00 | Balanced attack |
| formation_attack | Guard | all | 0.72 | Defense trades away offense |
| formation_attack | Wedge | all | 1.25 | Concentrated impact |
| formation_defense | Line | all | 0.92 | Cohesive line reduces losses |
| formation_defense | Guard | all | 0.70 | Braced units absorb damage |
| formation_defense | Wedge | all | 1.12 | Wedge exposes its flanks |
| morale | casualty | all | 0.70 | Morale lost per casualty |
| morale | surrounded | all | 0.80 | Extra morale loss per combat tick |
| morale | rout_threshold | all | 20 | Units below this morale rout |

