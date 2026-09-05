import {tacticalLessons,lessonProgress,type TacticalLesson} from '../lib/tactical-lessons';
import type {BattleUnit} from '../lib/game-types';
export function TacticalLessonBrief({lesson,units}:{lesson:TacticalLesson;units:BattleUnit[]}){
  const def=tacticalLessons.find(l=>l.key===lesson)!,complete=lessonProgress(lesson,units);
  return <section className={`lesson-brief ${complete?'complete':''}`} aria-label="Tactical lesson"><strong>{complete?'✓ Skill demonstrated':def.title}</strong><p>{complete?'You demonstrated the tactic. Finish the battle or withdraw to return to the Battle Lab.':def.hint}</p></section>;
}
