export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface CheckpointQuiz {
  title: string;
  questions: QuizQuestion[];
}

export interface RemedialLesson {
  title: string;
  explanation: string;
  keyTakeaways: string[];
  practiceQuestions: QuizQuestion[];
}

export interface DayPlan {
  day: number;
  topic: string;
  explanation: string;
  practiceExercise: string;
  estimatedMinutes: number;
  isCheckpoint: boolean;
  checkpointQuiz?: CheckpointQuiz;
  
  // Adaptive additions
  remedialLesson?: RemedialLesson;
  analogyExplanation?: string;
  
  // User progress state
  completed?: boolean;
  completedAt?: string;
  quizSubmitted?: boolean;
  quizScore?: number;
  quizUserAnswers?: Record<number, number>; // question index -> option index
}

export interface Roadmap {
  id: string;
  goal: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  estimatedTotalDays: number;
  createdAt: string;
  days: DayPlan[];
  lastAdjustedReason?: string;
  lastAdjustedAt?: string;
}

export interface QuizSubmissionResult {
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  failedQuestions: {
    question: string;
    selectedOption: string;
    correctOption: string;
    explanation: string;
  }[];
}
