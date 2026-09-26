import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini Client
export function getGeminiClient(): GoogleGenAI {
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

// In-memory rate limiting per IP: max 25 requests per 10 minutes
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const ipRateLimit = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;

export function checkIpRateLimit(clientIp: string): { allowed: boolean; message?: string } {
  const ip = clientIp || 'unknown-client';
  const now = Date.now();
  const record = ipRateLimit.get(ip);

  if (!record || now > record.resetTime) {
    ipRateLimit.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return {
      allowed: false,
      message: `Rate limit reached. Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} before creating or adjusting roadmaps to keep the service fast and free for everyone.`,
    };
  }

  record.count += 1;
  return { allowed: true };
}

// Helper to call Gemini with primary model and fallbacks, plus exponential backoff
export async function callGeminiStructured(params: {
  contents: string;
  systemInstruction?: string;
  responseSchema: any;
}) {
  const ai = getGeminiClient();
  const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
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

        if (errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available')) {
          break;
        }

        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429')) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error('Failed to generate response with Gemini.');
}

export { Type };
