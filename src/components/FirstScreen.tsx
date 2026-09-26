import React, { useState } from 'react';
import { ArrowRight, Sparkles, BookOpen, Layers, Target } from 'lucide-react';

interface FirstScreenProps {
  onGenerate: (goal: string, level: 'Beginner' | 'Intermediate' | 'Advanced') => void;
  isLoading: boolean;
}

export const FirstScreen: React.FC<FirstScreenProps> = ({ onGenerate, isLoading }) => {
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');

  const exampleGoals = [
    { label: 'Learn Python basics', icon: '🐍' },
    { label: 'Learn digital marketing', icon: '📈' },
    { label: 'Learn UI/UX design basics', icon: '🎨' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isLoading) return;
    onGenerate(goal.trim(), level);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-medium mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Powered by Gemini 2.5 Flash
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 mb-4 font-serif">
          Learn anything at your own pace.
        </h1>

        <p className="text-base sm:text-lg text-zinc-600 max-w-lg mx-auto leading-relaxed">
          Type any skill you want to master and get a personalized, day-by-day study roadmap that adapts in real time to how well you understand it.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Custom Goal Input */}
          <div>
            <label htmlFor="learning-goal" className="block text-sm font-semibold text-zinc-800 mb-2">
              What do you want to learn?
            </label>
            <div className="relative">
              <input
                id="learning-goal"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Learn Python basics, Master financial literacy, Modern photography..."
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-all text-base"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 3 Clickable Example Goals */}
          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2.5">
              Or try a popular example:
            </span>
            <div className="flex flex-wrap gap-2">
              {exampleGoals.map((eg) => (
                <button
                  key={eg.label}
                  type="button"
                  onClick={() => setGoal(eg.label)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-left border ${
                    goal === eg.label
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-sm">{eg.icon}</span>
                  <span>{eg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Level Dropdown */}
          <div className="pt-1">
            <label htmlFor="learning-level" className="block text-sm font-semibold text-zinc-800 mb-2">
              Your current experience level
            </label>
            <div className="relative">
              <select
                id="learning-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-hidden focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="Beginner">Beginner — Starting completely fresh (no jargon, friendly analogies)</option>
                <option value="Intermediate">Intermediate — Familiar with basic concepts, looking to build practical skill</option>
                <option value="Advanced">Advanced — Solid background, seeking deep nuances and mastery</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!goal.trim() || isLoading}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-sm flex items-center justify-center gap-2 group text-base"
            >
              <span>Generate my roadmap</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Trust & Methodology Features */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
        <div className="flex flex-col items-center sm:items-start p-4 rounded-xl bg-white/60 border border-zinc-200/60">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">Tailored Day Count</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Not a rigid 30-day template. Gemini scopes the days specifically to how big the topic is.
          </p>
        </div>

        <div className="flex flex-col items-center sm:items-start p-4 rounded-xl bg-white/60 border border-zinc-200/60">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3">
            <Target className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">Checkpoint Quizzes</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Strategic 5-question quizzes test understanding at sensible milestones along your path.
          </p>
        </div>

        <div className="flex flex-col items-center sm:items-start p-4 rounded-xl bg-white/60 border border-zinc-200/60">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">Live Adaptation</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Struggling? It inserts mini-lessons or analogies. Flying through? It accelerates your pace.
          </p>
        </div>
      </div>
    </div>
  );
};
