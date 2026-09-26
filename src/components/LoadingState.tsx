import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Brain, CheckCircle2 } from 'lucide-react';

interface LoadingStateProps {
  goal: string;
  level: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ goal, level }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    'Analyzing scope and learning curves for your goal...',
    'Breaking down concepts into jargon-free daily steps...',
    'Calibrating practical, 20-minute daily exercises...',
    'Formulating strategic 5-question checkpoint quizzes...',
    'Polishing your personalized study roadmap...',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2400);

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-8 shadow-sm">
        <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-100 animate-ping opacity-30" />
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md">
            <Brain className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-zinc-900 mb-2">
          Generating your roadmap
        </h3>

        <p className="text-sm text-zinc-600 mb-6 font-medium">
          "{goal}" &bull; <span className="text-zinc-500">{level}</span>
        </p>

        {/* Dynamic Status Steps */}
        <div className="space-y-3 text-left bg-zinc-50/80 border border-zinc-200/60 rounded-xl p-4 mb-6">
          {steps.map((text, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div
                key={text}
                className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                  isCurrent
                    ? 'text-zinc-900 font-semibold'
                    : isCompleted
                    ? 'text-zinc-400 font-normal line-through'
                    : 'text-zinc-400 opacity-40'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />
                )}
                <span>{text}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-zinc-400">
          Takes about 5–10 seconds. We're sizing the days directly to the topic's depth.
        </p>
      </div>
    </div>
  );
};
