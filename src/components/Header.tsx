import React from 'react';
import { Compass, RotateCcw } from 'lucide-react';

interface HeaderProps {
  hasActiveRoadmap: boolean;
  onResetRoadmap?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hasActiveRoadmap, onResetRoadmap }) => {
  return (
    <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-zinc-900">
              learn anything
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              adaptive roadmap
            </span>
          </div>
        </div>

        {hasActiveRoadmap && onResetRoadmap && (
          <button
            onClick={onResetRoadmap}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200"
            title="Start a new learning roadmap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start a new roadmap</span>
          </button>
        )}
      </div>
    </header>
  );
};
