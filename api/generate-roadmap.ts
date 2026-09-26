import { checkIpRateLimit, callGeminiStructured, Type } from './gemini-service.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = (req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown-client');

  const rateCheck = checkIpRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.message });
  }

  try {
    const { goal, level } = req.body || {};

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

    if (Array.isArray(roadmap.days)) {
      roadmap.days.forEach((d: any) => {
        if (d.isCheckpoint && d.checkpointQuiz && Array.isArray(d.checkpointQuiz.questions)) {
          d.checkpointQuiz.questions.forEach((q: any, idx: number) => {
            if (!q.id) q.id = `q-${d.day}-${idx + 1}`;
          });
        }
      });
    }

    return res.status(200).json({ success: true, roadmap });
  } catch (error: any) {
    console.error('Error generating roadmap:', error);
    let userFriendlyMsg = error?.message || 'Could not generate your roadmap. Please check your connection and try again.';
    if (userFriendlyMsg.includes('429') || userFriendlyMsg.includes('quota') || userFriendlyMsg.includes('RESOURCE_EXHAUSTED')) {
      userFriendlyMsg = 'The Gemini API quota is briefly cooling down (Google limits free tier requests per minute). Please wait 30 seconds and click Try Again.';
    } else if (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('high demand') || userFriendlyMsg.includes('UNAVAILABLE')) {
      userFriendlyMsg = 'The AI model is experiencing a temporary spike in demand. Please try again in 15 seconds.';
    }

    return res.status(500).json({ error: userFriendlyMsg });
  }
}
