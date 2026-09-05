"use client";
export function FieldTraining({step,onSkip}:{step:number;onSkip:()=>void}){
  const lessons=[
    ["1 · Deploy", "Select a cohort and click a new position inside the red deployment zone."],
    ["2 · Face the enemy", "Use the facing arrows to rotate the selected formation. Its front matters when defending."],
    ["3 · Choose a frontage", "Try Narrow or Wide. Narrow formations cross bridges more easily; wide formations improve volleys."],
    ["4 · Take command", "Begin the battle. Tap an enemy to inspect it, then choose Attack target, or issue Attack to your selected cohorts."],
    ["Training complete", "Use Pause to plan your next move and Select all to command the army. On a keyboard, Space pauses and Shift-click selects more cohorts. Missile troops skirmish automatically; use Retreat to preserve veterans."],
  ];
  return <aside className="field-training" aria-live="polite"><strong>{lessons[step][0]}</strong><p>{lessons[step][1]}</p><button onClick={onSkip}>{step===4?"Got it":"Skip training"}</button></aside>;
}
