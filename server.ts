import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// Simple in-memory rate limiter per IP: max 25 requests per 10 minutes
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const ipRateLimit = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 25;

function checkRateLimit(req: Request, res: Response, next: () => void) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket.remoteAddress || 'unknown-client';
  
  const now = Date.now();
  const record = ipRateLimit.get(ip);

  if (!record || now > record.resetTime) {
    ipRateLimit.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: `Rate limit reached. Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} before creating or adjusting roadmaps to keep the service fast and free for everyone.`,
    });
  }

  record.count += 1;
  next();
}

// Initialize Gemini Client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to call Gemini with primary model and fallbacks, plus exponential backoff
async function callGeminiStructured(params: {
  contents: string;
  systemInstruction?: string;
  responseSchema: any;
}) {
  const ai = getGeminiClient();
  // Try requested gemini-2.5-flash first, falling back to gemini-flash-latest and gemini-3.8-flash
  const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    // Retry up to 2 times per model on transient errors (e.g. 503)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: params.responseSchema,
            temperature: 0.7,
          },
        });

        if (!response.text) {
          throw new Error('Gemini returned an empty response.');
        }

        return JSON.parse(response.text.trim());
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`Model ${model} attempt ${attempt + 1} failed:`, errMsg);

        // If 404 model not found / deprecated, break out of retry and move to next candidate model immediately
        if (errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available')) {
          break;
        }

        // If transient spike (503 / 429), back off and retry
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429')) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        // Other client errors
        break;
      }
    }
  }

  throw lastError || new Error('Failed to generate response with Gemini.');
}

// ---------------- API ROUTES ----------------

// Generate Roadmap Endpoint
app.post('/api/generate-roadmap', checkRateLimit, async (req: Request, res: Response) => {
  try {
    const { goal, level } = req.body;

    if (!goal || typeof goal !== 'string' || goal.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a valid learning goal.' });
    }

    const userLevel = ['Beginner', 'Intermediate', 'Advanced'].includes(level)
      ? level
      : 'Beginner';

    const prompt = `
Create a realistic, adaptive day-by-day study roadmap for someone who wants to: "${goal.trim()}".
Their self-identified current level is: "${userLevel}".

Guidelines:
1. Topic Scope & Days:
   - Determine an optimal number of days based on the scope and complexity of the goal.
   - For quick or tightly focused goals (e.g. "learn markdown" or "basic git"), use 3-5 days.
   - For medium topics (e.g. "Python basics", "SQL fundamentals", "digital marketing"), use 6-9 days.
   - For broader topics (e.g. "full stack web development", "machine learning concepts"), use 10-14 days.
   - Do NOT force an artificial fixed 30-day schedule. Make it achievable and focused.

2. Tone & Content:
   - Empathetic, encouraging, clear, and jargon-free.
   - Assume no prior background unless the user's level is explicitly Intermediate or Advanced.
   - Each day's explanation must be 2-4 sentences explaining the core concept clearly.
   - Each day must include one small, tangible, and practical exercise that takes 15-40 minutes.

3. Checkpoint Quizzes:
   - Insert checkpoint quizzes at points where material builds on itself or after dense key concepts.
   - Typically include 1 to 3 checkpoints across the entire roadmap (e.g. for a 7-day roadmap, day 3 and day 7 might have checkpoints).
   - Set 'isCheckpoint: true' on days that have a checkpoint.
   - Each checkpoint quiz MUST have EXACTLY 5 multiple-choice questions testing practical understanding (not tricky syntax).
   - Each question must have 4 options, a correctOptionIndex (0-3), and a clear 1-2 sentence explanation of why the correct option is right.
`;

    const roadmapSchema = {
      type: Type.OBJECT,
      properties: {
        goal: { type: Type.STRING },
        level: { type: Type.STRING },
        summary: {
          type: Type.STRING,
          description: 'A 2-sentence warm summary of what the learner will accomplish.',
        },
        estimatedTotalDays: { type: Type.INTEGER },
        days: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              topic: { type: Type.STRING },
              explanation: {
                type: Type.STRING,
                description: '2 to 4 sentences, clear and jargon-free.',
              },
              practiceExercise: {
                type: Type.STRING,
                description: 'A specific, small exercise to practice today.',
              },
              estimatedMinutes: {
                type: Type.INTEGER,
                description: 'Estimated minutes to complete, between 15 and 45.',
              },
              isCheckpoint: {
                type: Type.BOOLEAN,
                description: 'True if this day contains a 5-question checkpoint quiz.',
              },
              checkpointQuiz: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    description: 'Exactly 5 multiple-choice questions if isCheckpoint is true.',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        question: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: 'Array of 4 multiple choice options.',
                        },
                        correctOptionIndex: {
                          type: Type.INTEGER,
                          description: '0-based index (0, 1, 2, or 3) of the correct answer.',
                        },
                        explanation: {
                          type: Type.STRING,
                          description: 'Why the correct answer is right.',
                        },
                      },
                      required: ['id', 'question', 'options', 'correctOptionIndex', 'explanation'],
                    },
                  },
                },
                required: ['title', 'questions'],
              },
            },
            required: ['day', 'topic', 'explanation', 'practiceExercise', 'estimatedMinutes', 'isCheckpoint'],
          },
        },
      },
      required: ['goal', 'level', 'summary', 'estimatedTotalDays', 'days'],
    };

    const roadmap = await callGeminiStructured({
      contents: prompt,
      systemInstruction: 'You are an elite, encouraging educational mentor who creates structured, adaptive learning roadmaps in clean JSON.',
      responseSchema: roadmapSchema,
    });

    // Ensure IDs on questions if missing
    if (Array.isArray(roadmap.days)) {
      roadmap.days.forEach((d: any) => {
        if (d.isCheckpoint && d.checkpointQuiz && Array.isArray(d.checkpointQuiz.questions)) {
          d.checkpointQuiz.questions.forEach((q: any, idx: number) => {
            if (!q.id) q.id = `q-${d.day}-${idx + 1}`;
          });
        }
      });
    }

    res.json({ success: true, roadmap });
  } catch (error: any) {
    console.error('Error generating roadmap:', error);
    let userFriendlyMsg = error?.message || 'Could not generate your roadmap. Please check your connection and try again.';
    if (userFriendlyMsg.includes('429') || userFriendlyMsg.includes('quota') || userFriendlyMsg.includes('RESOURCE_EXHAUSTED')) {
      userFriendlyMsg = 'The Gemini API quota is briefly cooling down (Google limits free tier requests per minute). Please wait 30 seconds and click Try Again.';
    } else if (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('high demand') || userFriendlyMsg.includes('UNAVAILABLE')) {
      userFriendlyMsg = 'The AI model is experiencing a temporary spike in demand. Please try again in 15 seconds.';
    }

    res.status(500).json({ error: userFriendlyMsg });
  }
});

// Adapt Roadmap Endpoint (for Remedial Mini-Lesson or Restructuring)
app.post('/api/adapt-roadmap', checkRateLimit, async (req: Request, res: Response) => {
  try {
    const { action, goal, level, dayNumber, topic, failedQuestions, upcomingDays } = req.body;

    if (!action || !['remedial', 'restructure'].includes(action)) {
      return res.status(400).json({ error: 'Invalid adaptation action.' });
    }

    if (action === 'remedial') {
      // Score was 50-79%: Remedial mini-lesson + 2 new practice questions
      const prompt = `
The learner is studying "${goal}" at level "${level}".
They just took the Checkpoint Quiz for Day ${dayNumber}: "${topic}".
They scored between 50% and 79%. Here are the specific questions they struggled with:
${JSON.stringify(failedQuestions, null, 2)}

Provide an adaptive remedial module:
1. Explain the missed concepts gently and clearly in 2-3 short paragraphs, dispelling common misconceptions.
2. Provide 3 key bullet-point takeaways.
3. Provide 2 NEW multiple-choice practice questions with 4 options each, correctOptionIndex (0-3), and explanations.
4. Provide a friendly 1-sentence explanation of why the path was adjusted (e.g., "We added a focused mini-lesson and 2 review questions to solidify [concept] before moving forward.").
`;

      const remedialSchema = {
        type: Type.OBJECT,
        properties: {
          adjustmentExplanation: {
            type: Type.STRING,
            description: 'One-line explanation of why this path adjustment was made.',
          },
          remedialLesson: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              practiceQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctOptionIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'question', 'options', 'correctOptionIndex', 'explanation'],
                },
              },
            },
            required: ['title', 'explanation', 'keyTakeaways', 'practiceQuestions'],
          },
        },
        required: ['adjustmentExplanation', 'remedialLesson'],
      };

      const result = await callGeminiStructured({
        contents: prompt,
        systemInstruction: 'You are an adaptive tutor creating remedial micro-lessons for students who need extra practice on specific topics.',
        responseSchema: remedialSchema,
      });

      return res.json({ success: true, result });
    } else {
      // Score was < 50%: Restructure upcoming days into smaller, simpler steps + explain with analogy
      const prompt = `
The learner is studying "${goal}" at level "${level}".
They just took the Checkpoint Quiz for Day ${dayNumber}: "${topic}".
They scored below 50% (${JSON.stringify(failedQuestions)}).

Please adapt their journey:
1. Explain the concept they struggled with using a vivid, intuitive real-world ANALOGY (no heavy jargon).
2. Restructure the upcoming days (${JSON.stringify(upcomingDays)}) into smaller, more bite-sized, simpler steps so they gain confidence without feeling overwhelmed. Keep the same day count or expand by 1-2 days if needed to pace gently.
3. Provide a warm 1-sentence explanation of why the path was adjusted (e.g., "Pace adjusted: upcoming days simplified with intuitive analogies to build strong foundations.").
`;

      const restructureSchema = {
        type: Type.OBJECT,
        properties: {
          adjustmentExplanation: {
            type: Type.STRING,
            description: 'One-line explanation of why the path was adjusted.',
          },
          analogyExplanation: {
            type: Type.STRING,
            description: 'A vivid, relatable everyday analogy explaining the core failed concept.',
          },
          restructuredDays: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                topic: { type: Type.STRING },
                explanation: { type: Type.STRING },
                practiceExercise: { type: Type.STRING },
                estimatedMinutes: { type: Type.INTEGER },
                isCheckpoint: { type: Type.BOOLEAN },
                checkpointQuiz: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          question: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          correctOptionIndex: { type: Type.INTEGER },
                          explanation: { type: Type.STRING },
                        },
                        required: ['id', 'question', 'options', 'correctOptionIndex', 'explanation'],
                      },
                    },
                  },
                },
              },
              required: ['day', 'topic', 'explanation', 'practiceExercise', 'estimatedMinutes', 'isCheckpoint'],
            },
          },
        },
        required: ['adjustmentExplanation', 'analogyExplanation', 'restructuredDays'],
      };

      const result = await callGeminiStructured({
        contents: prompt,
        systemInstruction: 'You are an empathetic, world-class educator who breaks complex ideas down using intuitive analogies and gentle pacing.',
        responseSchema: restructureSchema,
      });

      return res.json({ success: true, result });
    }
  } catch (error: any) {
    console.error('Error adapting roadmap:', error);
    const { action, topic, failedQuestions, upcomingDays } = req.body;

    // Resilient fallback: If API quota or transient network error occurs,
    // construct a high-quality contextual adaptation from the missed questions so the student is never blocked
    if (action === 'remedial' && Array.isArray(failedQuestions) && failedQuestions.length > 0) {
      const fallbackRemedial = {
        adjustmentExplanation: `We added a focused mini-lesson to clarify the questions you missed on ${topic || 'this checkpoint'}.`,
        remedialLesson: {
          title: `Reinforcing Key Concepts: ${topic || 'Review'}`,
          explanation: failedQuestions.map((f: any) => `Regarding "${f.question}": Remember that ${f.explanation}`).join(' '),
          keyTakeaways: failedQuestions.map((f: any) => f.explanation).slice(0, 3),
          practiceQuestions: failedQuestions.slice(0, 2).map((f: any, idx: number) => ({
            id: `rq-fallback-${idx + 1}`,
            question: `Review: ${f.question}`,
            options: [f.correctOption, f.selectedOption, 'None of the above', 'Both are valid'].filter(Boolean),
            correctOptionIndex: 0,
            explanation: f.explanation,
          })),
        },
      };
      return res.json({ success: true, result: fallbackRemedial });
    }

    if (action === 'restructure' && Array.isArray(upcomingDays)) {
      const fallbackRestructure = {
        adjustmentExplanation: 'Pace adjusted: upcoming topics simplified to give you extra time with the fundamentals.',
        analogyExplanation: `Think of learning ${topic || 'this skill'} like building a sturdy house: before putting on the roof, making sure the foundation pillars are rock-solid makes everything easier later.`,
        restructuredDays: upcomingDays.map((d: any) => ({
          ...d,
          explanation: `Step-by-step foundation: ${d.explanation}`,
          estimatedMinutes: Math.max(15, (d.estimatedMinutes || 25) - 5),
        })),
      };
      return res.json({ success: true, result: fallbackRestructure });
    }

    let userFriendlyMsg = error?.message || 'Could not adapt roadmap. Please try again.';
    if (userFriendlyMsg.includes('429') || userFriendlyMsg.includes('quota')) {
      userFriendlyMsg = 'The AI service quota is briefly cooling down. Please try again in 30 seconds.';
    }
    res.status(500).json({ error: userFriendlyMsg });
  }
});

// ---------------- VITE & STATIC FILE SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Learn Anything server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
