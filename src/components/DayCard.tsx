import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Sparkles,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { DayPlan } from '../types.ts';

interface DayCardProps {
  day: DayPlan;
  onToggleComplete: (dayNumber: number) => void;
  onOpenQuiz: (day: DayPlan) => void;
}

export const DayCard: React.FC<DayCardProps> = ({
  day,
  onToggleComplete,
  onOpenQuiz,
}) => {
  const [remedialAnswers, setRemedialAnswers] = useState<Record<number, number>>({});
  const [showRemedialDetails, setShowRemedialDetails] = useState(true);

  const isDone = !!day.completed;
  const hasQuiz = day.isCheckpoint && day.checkpointQuiz;
  const isQuizSubmitted = !!day.quizSubmitted;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isDone
          ? 'bg-zinc-50/70 border-zinc-200'
          : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
      }`}
    >
      {/* Header Bar */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                isDone
                  ? 'bg-zinc-200 text-zinc-700'
                  : 'bg-zinc-900 text-white'
              }`}
            >
              Day {day.day}
            </span>

            <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{day.estimatedMinutes} mins</span>
            </div>

            {day.isCheckpoint && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>Checkpoint Quiz</span>
              </span>
            )}
          </div>

          {/* Mark Complete Checkbox Button */}
          <button
            type="button"
            onClick={() => onToggleComplete(day.day)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isDone
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
            }`}
          >
            {isDone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-zinc-400" />
                <span>Mark Done</span>
              </>
            )}
          </button>
        </div>

        {/* Topic Title */}
        <h3
          className={`text-lg sm:text-xl font-bold tracking-tight mb-2 ${
            isDone ? 'text-zinc-500 line-through' : 'text-zinc-900'
          }`}
        >
          {day.topic}
        </h3>

        {/* Jargon-free Explanation */}
        <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mb-5">
          {day.explanation}
        </p>

        {/* Real-World Analogy (Inserted when adapted from <50% score) */}
        {day.analogyExplanation && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/70">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Intuitive Real-World Analogy
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
              {day.analogyExplanation}
            </p>
          </div>
        )}

        {/* Small Practice Exercise */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Today's Practice Exercise
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
            {day.practiceExercise}
          </p>
        </div>

        {/* Remedial Mini-Lesson Section (Inserted if score was 50-79%) */}
        {day.remedialLesson && (
          <div className="mt-5 border border-indigo-200 bg-indigo-50/40 rounded-xl overflow-hidden">
            <div
              onClick={() => setShowRemedialDetails(!showRemedialDetails)}
              className="p-3.5 bg-indigo-100/60 border-b border-indigo-200 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-700" />
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Adaptive Mini-Lesson: {day.remedialLesson.title}
                </span>
              </div>
              <button className="text-indigo-700 p-1">
                {showRemedialDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {showRemedialDetails && (
              <div className="p-4 sm:p-5 space-y-4">
                <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed">
                  {day.remedialLesson.explanation}
                </p>

                {day.remedialLesson.keyTakeaways?.length > 0 && (
                  <div className="bg-white/80 p-3 rounded-lg border border-indigo-100">
                    <span className="text-xs font-semibold text-indigo-950 block mb-1.5">
                      Key Takeaways:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-zinc-700">
                      {day.remedialLesson.keyTakeaways.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 2 Remedial Practice Questions */}
                {day.remedialLesson.practiceQuestions?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block mb-2">
                      2 Checkpoint Review Questions
                    </span>
                    <div className="space-y-3">
                      {day.remedialLesson.practiceQuestions.map((rq, qIdx) => {
                        const selected = remedialAnswers[qIdx];
                        return (
                          <div
                            key={rq.id || qIdx}
                            className="bg-white p-3.5 rounded-lg border border-indigo-100"
                          >
                            <p className="text-xs font-semibold text-zinc-900 mb-2">
                              {qIdx + 1}. {rq.question}
                            </p>
                            <div className="space-y-1.5">
                              {rq.options.map((opt, optIdx) => {
                                const isChosen = selected === optIdx;
                                const isCorrect = optIdx === rq.correctOptionIndex;
                                let btnClass = 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100';
                                if (selected !== undefined) {
                                  if (isCorrect) {
                                    btnClass = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-medium';
                                  } else if (isChosen) {
                                    btnClass = 'bg-rose-100 border-rose-300 text-rose-950 line-through';
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() =>
                                      setRemedialAnswers((prev) => ({
                                        ...prev,
                                        [qIdx]: optIdx,
                                      }))
                                    }
                                    className={`w-full text-left text-xs px-3 py-2 rounded-md border transition-all ${btnClass}`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}. {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {selected !== undefined && (
                              <p className="text-[11px] text-zinc-600 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200/60">
                                <span className="font-semibold text-zinc-800">Why: </span>
                                {rq.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Checkpoint Quiz Callout & Trigger */}
        {hasQuiz && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-xs">
                {isQuizSubmitted ? (
                  <span className="font-semibold text-zinc-800">
                    Quiz Completed &bull; Score: {day.quizScore}%
                    {day.quizScore! >= 80 ? (
                      <span className="ml-1.5 text-emerald-600">(Mastered)</span>
                    ) : day.quizScore! >= 50 ? (
                      <span className="ml-1.5 text-amber-600">(Remedial Applied)</span>
                    ) : (
                      <span className="ml-1.5 text-rose-600">(Simplified Path)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-600 font-medium">
                    Test your understanding with a 5-question checkpoint quiz
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenQuiz(day)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0 ${
                isQuizSubmitted
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isQuizSubmitted ? 'Retake / Review Quiz' : 'Take 5-Question Quiz'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
