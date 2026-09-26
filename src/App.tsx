/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { FirstScreen } from './components/FirstScreen.tsx';
import { LoadingState } from './components/LoadingState.tsx';
import { ErrorMessage } from './components/ErrorMessage.tsx';
import { ProgressBar } from './components/ProgressBar.tsx';
import { DayCard } from './components/DayCard.tsx';
import { QuizModal } from './components/QuizModal.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { Roadmap, DayPlan, QuizSubmissionResult } from './types.ts';
import { Sparkles, Info, X } from 'lucide-react';

const STORAGE_KEY = 'learn_anything_active_roadmap';

export default function App() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGoalDetails, setCurrentGoalDetails] = useState<{
    goal: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
  } | null>(null);

  const [activeQuizDay, setActiveQuizDay] = useState<DayPlan | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [adjustmentBanner, setAdjustmentBanner] = useState<string | null>(null);

  // Resume saved roadmap on initial load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.days) && parsed.goal) {
          setRoadmap(parsed);
          if (parsed.lastAdjustedReason) {
            setAdjustmentBanner(parsed.lastAdjustedReason);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore saved roadmap from localStorage:', e);
    }
  }, []);

  // Sync roadmap changes to localStorage
  const saveRoadmap = (updated: Roadmap | null) => {
    setRoadmap(updated);
    if (updated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Generate new roadmap
  const handleGenerateRoadmap = async (
    goal: string,
    level: 'Beginner' | 'Intermediate' | 'Advanced'
  ) => {
    setIsLoading(true);
    setError(null);
    setCurrentGoalDetails({ goal, level });

    try {
      const response = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, level }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate roadmap. Please try again.');
      }

      const generated: Roadmap = {
        id: `rm_${Date.now()}`,
        goal: data.roadmap.goal || goal,
        level: data.roadmap.level || level,
        summary: data.roadmap.summary || '',
        estimatedTotalDays: data.roadmap.estimatedTotalDays || data.roadmap.days.length,
        createdAt: new Date().toISOString(),
        days: data.roadmap.days.map((d: any) => ({
          ...d,
          completed: false,
          quizSubmitted: false,
        })),
      };

      saveRoadmap(generated);
      setAdjustmentBanner(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Day Completion
  const handleToggleComplete = (dayNumber: number) => {
    if (!roadmap) return;
    const updatedDays = roadmap.days.map((d) => {
      if (d.day === dayNumber) {
        return {
          ...d,
          completed: !d.completed,
          completedAt: !d.completed ? new Date().toISOString() : undefined,
        };
      }
      return d;
    });

    const updatedRoadmap: Roadmap = {
      ...roadmap,
      days: updatedDays,
    };
    saveRoadmap(updatedRoadmap);
  };

  // Checkpoint Quiz Submission & Adaptive Flow
  const handleQuizSubmission = async (result: QuizSubmissionResult) => {
    if (!roadmap || !activeQuizDay) return;

    const dayNumber = activeQuizDay.day;
    const score = result.scorePercent;

    // 1. Mark quiz as submitted on this day
    let updatedDays = roadmap.days.map((d) => {
      if (d.day === dayNumber) {
        return {
          ...d,
          quizSubmitted: true,
          quizScore: score,
        };
      }
      return d;
    });

    let newAdjustmentReason: string | undefined = undefined;

    // Scenario A: Score >= 80% (Mastery)
    if (score >= 80) {
      newAdjustmentReason = `Outstanding mastery (${score}%) on Day ${dayNumber}! Advancing along your roadmap at optimal pace.`;
      const updatedRoadmap: Roadmap = {
        ...roadmap,
        days: updatedDays,
        lastAdjustedReason: newAdjustmentReason,
        lastAdjustedAt: new Date().toISOString(),
      };
      saveRoadmap(updatedRoadmap);
      setAdjustmentBanner(newAdjustmentReason);
      return;
    }

    // Adapt via server route for remedial or restructuring
    setIsAdapting(true);
    try {
      if (score >= 50 && score < 80) {
        // Scenario B: Score 50-79% -> Remedial mini-lesson + 2 practice questions
        const adaptRes = await fetch('/api/adapt-roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'remedial',
            goal: roadmap.goal,
            level: roadmap.level,
            dayNumber,
            topic: activeQuizDay.topic,
            failedQuestions: result.failedQuestions,
          }),
        });

        const adaptData = await adaptRes.json();
        if (adaptRes.ok && adaptData.success && adaptData.result) {
          const { adjustmentExplanation, remedialLesson } = adaptData.result;
          newAdjustmentReason = adjustmentExplanation || 'Added a targeted mini-lesson and 2 review questions to solidify concepts.';

          updatedDays = updatedDays.map((d) => {
            if (d.day === dayNumber) {
              return {
                ...d,
                remedialLesson,
              };
            }
            return d;
          });
        } else {
          newAdjustmentReason = 'Review the explanations above to strengthen these concepts before continuing.';
        }
      } else {
        // Scenario C: Score < 50% -> Restructure upcoming days + intuitive analogy
        const upcomingDays = roadmap.days.filter((d) => d.day > dayNumber);

        const adaptRes = await fetch('/api/adapt-roadmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restructure',
            goal: roadmap.goal,
            level: roadmap.level,
            dayNumber,
            topic: activeQuizDay.topic,
            failedQuestions: result.failedQuestions,
            upcomingDays,
          }),
        });

        const adaptData = await adaptRes.json();
        if (adaptRes.ok && adaptData.success && adaptData.result) {
          const { adjustmentExplanation, analogyExplanation, restructuredDays } = adaptData.result;
          newAdjustmentReason = adjustmentExplanation || 'Pace adjusted: upcoming days simplified with intuitive analogies to build strong foundations.';

          // Past and current days
          const currentAndPast = updatedDays.filter((d) => d.day <= dayNumber).map((d) => {
            if (d.day === dayNumber) {
              return {
                ...d,
                analogyExplanation,
              };
            }
            return d;
          });

          // Renumber and merge restructured days
          const mergedRestructured = (restructuredDays || []).map((rd: any, idx: number) => ({
            ...rd,
            day: dayNumber + 1 + idx,
            completed: false,
            quizSubmitted: false,
          }));

          updatedDays = [...currentAndPast, ...mergedRestructured];
        } else {
          newAdjustmentReason = 'Pace adjusted: take your time reviewing foundational concepts before moving forward.';
        }
      }

      const updatedRoadmap: Roadmap = {
        ...roadmap,
        days: updatedDays,
        estimatedTotalDays: updatedDays.length,
        lastAdjustedReason: newAdjustmentReason,
        lastAdjustedAt: new Date().toISOString(),
      };

      saveRoadmap(updatedRoadmap);
      if (newAdjustmentReason) {
        setAdjustmentBanner(newAdjustmentReason);
      }
    } catch (e) {
      console.error('Failed to adapt roadmap:', e);
    } finally {
      setIsAdapting(false);
    }
  };

  // Reset / Clear Roadmap
  const handleConfirmReset = () => {
    saveRoadmap(null);
    setShowResetModal(false);
    setAdjustmentBanner(null);
    setError(null);
    setCurrentGoalDetails(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completedCount = roadmap?.days.filter((d) => d.completed).length || 0;
  const totalMinutes = roadmap?.days.reduce((acc, d) => acc + (d.estimatedMinutes || 25), 0) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
      <Header
        hasActiveRoadmap={!!roadmap && !isLoading}
        onResetRoadmap={() => setShowResetModal(true)}
      />

      <main className="flex-1">
        {/* Loading View */}
        {isLoading && currentGoalDetails && (
          <LoadingState
            goal={currentGoalDetails.goal}
            level={currentGoalDetails.level}
          />
        )}

        {/* Error View */}
        {!isLoading && error && (
          <ErrorMessage
            message={error}
            onRetry={
              currentGoalDetails
                ? () => handleGenerateRoadmap(currentGoalDetails.goal, currentGoalDetails.level)
                : undefined
            }
            onBack={() => {
              setError(null);
              setCurrentGoalDetails(null);
            }}
          />
        )}

        {/* Initial First Screen */}
        {!isLoading && !error && !roadmap && (
          <FirstScreen
            onGenerate={handleGenerateRoadmap}
            isLoading={isLoading}
          />
        )}

        {/* Active Roadmap View */}
        {!isLoading && !error && roadmap && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Progress Bar & Header Stats */}
            <ProgressBar
              completedDays={completedCount}
              totalDays={roadmap.days.length}
              goal={roadmap.goal}
              level={roadmap.level}
              totalMinutes={totalMinutes}
            />

            {/* Adaptive Notification Banner (Shows one-line explanation after quizzes) */}
            {adjustmentBanner && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
                      Adaptive Roadmap Update
                    </span>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed">
                      {adjustmentBanner}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAdjustmentBanner(null)}
                  className="text-amber-700 hover:text-amber-900 p-1 shrink-0 rounded-lg hover:bg-amber-100/50"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Summary Overview */}
            {roadmap.summary && (
              <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex items-start gap-3">
                <Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  {roadmap.summary}
                </p>
              </div>
            )}

            {/* List of Days */}
            <div className="space-y-6">
              {roadmap.days.map((day) => (
                <DayCard
                  key={day.day}
                  day={day}
                  onToggleComplete={handleToggleComplete}
                  onOpenQuiz={(d) => setActiveQuizDay(d)}
                />
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="mt-12 text-center pt-8 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs sm:text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                Finished or want to study something else? <span className="underline font-semibold">Start a new roadmap</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Checkpoint Quiz Modal */}
      {activeQuizDay && activeQuizDay.checkpointQuiz && (
        <QuizModal
          dayNumber={activeQuizDay.day}
          topic={activeQuizDay.topic}
          quiz={activeQuizDay.checkpointQuiz}
          onClose={() => setActiveQuizDay(null)}
          onSubmitResults={handleQuizSubmission}
          isAdapting={isAdapting}
        />
      )}

      {/* Start New Roadmap Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Start a new roadmap?"
        message="This will clear your current progress and roadmap from this browser so you can start fresh with a new learning goal."
        confirmText="Yes, start fresh"
        cancelText="Keep studying"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
