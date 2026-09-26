import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, ArrowRight, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { CheckpointQuiz, QuizSubmissionResult } from '../types.ts';

interface QuizModalProps {
  dayNumber: number;
  topic: string;
  quiz: CheckpointQuiz;
  onClose: () => void;
  onSubmitResults: (result: QuizSubmissionResult) => Promise<void>;
  isAdapting: boolean;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  dayNumber,
  topic,
  quiz,
  onClose,
  onSubmitResults,
  isAdapting,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);

  const totalQuestions = quiz.questions?.length || 5;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === totalQuestions;

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!allAnswered || isSubmitted) return;

    let correctCount = 0;
    const failedQuestions: QuizSubmissionResult['failedQuestions'] = [];

    quiz.questions.forEach((q, qIdx) => {
      const selectedOptIdx = selectedAnswers[qIdx];
      const isCorrect = selectedOptIdx === q.correctOptionIndex;

      if (isCorrect) {
        correctCount += 1;
      } else {
        failedQuestions.push({
          question: q.question,
          selectedOption: q.options[selectedOptIdx] || 'None',
          correctOption: q.options[q.correctOptionIndex] || 'Unknown',
          explanation: q.explanation || 'Review this fundamental concept.',
        });
      }
    });

    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const result: QuizSubmissionResult = {
      scorePercent,
      correctCount,
      totalCount: totalQuestions,
      passed: scorePercent >= 80,
      failedQuestions,
    };

    setSubmissionResult(result);
    setIsSubmitted(true);
    await onSubmitResults(result);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                Day {dayNumber} Checkpoint
              </span>
              <span className="text-xs text-zinc-500 font-medium">5 Questions</span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mt-1">
              {quiz.title || `Checkpoint Quiz: ${topic}`}
            </h3>
          </div>

          <button
            onClick={onClose}
            disabled={isAdapting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Questions */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {isSubmitted && submissionResult && (
            <div
              className={`p-5 rounded-xl border ${
                submissionResult.scorePercent >= 80
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : submissionResult.scorePercent >= 50
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {submissionResult.scorePercent >= 80 ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : submissionResult.scorePercent >= 50 ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <BookOpen className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <h4 className="font-bold text-base">
                      {submissionResult.scorePercent >= 80
                        ? 'Mastery Achieved!'
                        : submissionResult.scorePercent >= 50
                        ? 'Good Progress – Targeted Review'
                        : 'Foundations Need Reinforcement'}
                    </h4>
                    <span className="font-mono font-bold text-sm">
                      {submissionResult.scorePercent}% ({submissionResult.correctCount}/{submissionResult.totalCount})
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed mb-2 opacity-90">
                    {submissionResult.scorePercent >= 80
                      ? 'You demonstrated strong comprehension. Moving forward to the next topics with confidence!'
                      : submissionResult.scorePercent >= 50
                      ? 'You have a good grasp, but missed a couple of nuances. We are adding a focused mini-lesson and 2 quick review questions to solidify them.'
                      : 'These concepts can be tricky! We are simplifying the upcoming days and adding intuitive, real-world analogies to make the concepts click.'}
                  </p>

                  {isAdapting && (
                    <div className="flex items-center gap-2 text-xs font-semibold mt-2 pt-2 border-t border-black/10">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini is adapting your roadmap now...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {quiz.questions.map((q, qIdx) => {
            const selectedOpt = selectedAnswers[qIdx];
            const hasAnswered = selectedOpt !== undefined;
            const isCorrect = isSubmitted && selectedOpt === q.correctOptionIndex;
            const isWrong = isSubmitted && selectedOpt !== q.correctOptionIndex;

            return (
              <div
                key={q.id || qIdx}
                className={`p-4 rounded-xl border transition-all ${
                  isSubmitted
                    ? isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                    : 'bg-zinc-50/60 border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-600 shrink-0">
                    Q{qIdx + 1}
                  </span>
                  <p className="text-sm font-semibold text-zinc-900 leading-snug">
                    {q.question}
                  </p>
                </div>

                <div className="space-y-2 pl-2 sm:pl-9">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    const isCorrectAnswer = isSubmitted && optIdx === q.correctOptionIndex;
                    const isSelectedAndWrong = isSubmitted && isSelected && !isCorrect;

                    let optionStyle = 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300';
                    if (!isSubmitted && isSelected) {
                      optionStyle = 'bg-zinc-900 border-zinc-900 text-white shadow-xs';
                    } else if (isSubmitted) {
                      if (isCorrectAnswer) {
                        optionStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-medium';
                      } else if (isSelectedAndWrong) {
                        optionStyle = 'bg-rose-100 border-rose-300 text-rose-950 line-through';
                      } else {
                        optionStyle = 'bg-white/80 border-zinc-200 text-zinc-400';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelect(qIdx, optIdx)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium shrink-0 ${
                              isSelected && !isSubmitted
                                ? 'border-white text-white'
                                : 'border-zinc-300 text-zinc-500'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isSubmitted && isCorrectAnswer && (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                        )}
                        {isSelectedAndWrong && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Show explanation after submission */}
                {isSubmitted && (
                  <div className="mt-3.5 pl-2 sm:pl-9 text-xs text-zinc-600 bg-white/90 p-3 rounded-lg border border-zinc-200/80">
                    <span className="font-semibold text-zinc-800">Why: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 rounded-b-2xl">
          {!isSubmitted ? (
            <>
              <span className="text-xs text-zinc-500 font-medium">
                {answeredCount} of {totalQuestions} answered
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || isAdapting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <span>Submit Answers</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-xs text-zinc-500">
                {isAdapting ? 'Applying roadmap adaptations...' : 'Roadmap has been updated based on your score.'}
              </span>
              <button
                type="button"
                onClick={onClose}
                disabled={isAdapting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition-all shadow-xs"
              >
                Continue Learning
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
