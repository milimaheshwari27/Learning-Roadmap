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
    const { action, goal, level, dayNumber, topic, failedQuestions, upcomingDays } = req.body || {};

    if (!action || !['remedial', 'restructure'].includes(action)) {
      return res.status(400).json({ error: 'Invalid adaptation action.' });
    }

    if (action === 'remedial') {
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

      return res.status(200).json({ success: true, result });
    } else {
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

      return res.status(200).json({ success: true, result });
    }
  } catch (error: any) {
    console.error('Error adapting roadmap:', error);
    const { action, topic, failedQuestions, upcomingDays } = req.body || {};

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
      return res.status(200).json({ success: true, result: fallbackRemedial });
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
      return res.status(200).json({ success: true, result: fallbackRestructure });
    }

    let userFriendlyMsg = error?.message || 'Could not adapt roadmap. Please try again.';
    if (userFriendlyMsg.includes('429') || userFriendlyMsg.includes('quota')) {
      userFriendlyMsg = 'The AI service quota is briefly cooling down. Please try again in 30 seconds.';
    }
    return res.status(500).json({ error: userFriendlyMsg });
  }
}
