import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, onBack }) => {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-zinc-900 mb-2">
          Unable to build roadmap
        </h3>

        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
          {message || 'Something interrupted the roadmap generation. Please try again in a moment.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm transition-colors shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to start</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
