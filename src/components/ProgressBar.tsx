import React from 'react';
import { CheckCircle2, Clock, Calendar, Sparkles } from 'lucide-react';

interface ProgressBarProps {
  completedDays: number;
  totalDays: number;
  goal: string;
  level: string;
  totalMinutes: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  completedDays,
  totalDays,
  goal,
  level,
  totalMinutes,
}) => {
  const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const isFinished = totalDays > 0 && completedDays === totalDays;

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
              {level}
            </span>
            <span className="text-xs text-zinc-500 font-medium">Study Plan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {goal}
          </h2>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs font-medium text-zinc-600 bg-zinc-50 px-3.5 py-2 rounded-xl border border-zinc-200/80">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>{totalDays} Days Total</span>
          </div>
          <div className="h-3 w-px bg-zinc-200" />
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>~{Math.round(totalMinutes / 60)} hrs total</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            {isFinished ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-amber-700">Roadmap Completed! Fantastic work!</span>
              </>
            ) : (
              <span>{completedDays} of {totalDays} days completed</span>
            )}
          </span>
          <span className="text-zinc-900">{percentage}%</span>
        </div>

        <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFinished ? 'bg-amber-500' : 'bg-zinc-900'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
