/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-control-regex */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerateContentRequest,
} from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { PROMPTS } from '../utils/prompts.util';
const logger = new Logger('GeminiUtil');

// Model names
export const MODEL_NAMES = {
  DEFAULT: 'gemini-2.0-flash-exp',
  PRO: 'gemini-1.5-pro',
  PRO_LATEST: 'gemini-1.5-pro-latest',
  FLASH: 'gemini-2.0-flash-exp',
};

// Optional grounding tool (when you want Google Search grounding)
const GROUNDING_CONFIG = {
  tools: [{ googleSearchRetrieval: {} }],
};

function getApiKey(): string | undefined {
  return process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY; // ← dynamic
}
/** Is Gemini configured? */
export function isGeminiConfigured(): boolean {
  return !!getApiKey();
}

/** Acquire a model instance */
export function getGeminiModel(
  apiKey?: string,
  modelName?: string,
  useGrounding: boolean = false,
): GenerativeModel {
  const actualApiKey = apiKey || getApiKey();
  if (!actualApiKey) {
    throw new Error('Gemini API key not provided');
  }

  try {
    const genAI = new GoogleGenerativeAI(actualApiKey);
    const model = genAI.getGenerativeModel({
      model: modelName || MODEL_NAMES.DEFAULT,
      ...(useGrounding ? { tools: GROUNDING_CONFIG.tools as any } : {}),
    });
    return model;
  } catch (error) {
    logger.error('Gemini model creation error', error);
    throw new Error('Failed to create Gemini model');
  }
}

/** ---------- Robust JSON helpers ---------- */

/** Strip ```json fences (and generic ``` fences) */
function stripFences(s: string): string {
  return s
    .replace(/```json\s*([\s\S]*?)\s*```/gi, '$1')
    .replace(/```\s*([\s\S]*?)\s*```/g, '$1')
    .trim();
}

/**
 * Extract the largest balanced JSON object/array from text.
 * Returns null if none found.
 */
function extractBalancedJson(text: string): string | null {
  const s = stripFences(text);
  let best: { start: number; end: number } | null = null;

  const tryDelim = (open: '{' | '[', close: '}' | ']') => {
    const stack: number[] = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === open) stack.push(i);
      if (ch === close && stack.length) {
        const start = stack.pop()!;
        if (stack.length === 0) {
          best = { start, end: i + 1 }; // prefer the last full balance
        }
      }
    }
  };

  tryDelim('{', '}');
  tryDelim('[', ']');

  if (!best) return null;
  const { start, end } = best;
  return s?.slice(start, end);
}

/** Safe JSON.parse with light repairs */
function safeParse<T>(raw: string): T {
  let s = stripFences(raw);
  const extracted = extractBalancedJson(s);
  if (extracted) s = extracted;

  // very conservative cleanups
  s = s.replace(/\u0000/g, ''); // stray NULs
  s = s.replace(/,\s*([}\]])/g, '$1'); // trailing commas

  return JSON.parse(s) as T;
}

/** Centralized parser with logging */
function parseJsonResponse<T>(text: string, context: string): T {
  try {
    return safeParse<T>(text);
  } catch (error) {
    logger.error(`Gemini JSON parse error in ${context}`, error);
    throw new Error(`Failed to parse JSON from Gemini in ${context}.`);
  }
}

/** ---------- Core request wrapper ---------- */

/**
 * Run a `generateContent` with timeout & consistent error mapping.
 * For JSON endpoints we also set `responseMimeType: "application/json"`.
 */
async function generateContentWithTimeout(
  model: GenerativeModel,
  request: GenerateContentRequest,
  context: string,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s

  try {
    const result = await model.generateContent(request);
    clearTimeout(timeoutId);
    return result.response.text();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`Gemini API request timed out in ${context}`);
      throw new Error(`Gemini API request timed out in ${context}.`);
    }
    if (error?.message?.includes('API key not valid')) {
      logger.error(`Invalid Gemini API key in ${context}`, error);
      throw new Error('Invalid Gemini API key.');
    }
    logger.error(`Error in ${context}`, error);
    throw new Error(`Failed during ${context} with Gemini.`);
  }
}

/** ---------- Public functions ---------- */

export async function checkContentVisibility(
  domain: string,
  query: string,
  options?: {
    model?: string;
    temperature?: number;
    apiKey?: string;
    useGrounding?: boolean;
  },
  locale: string = 'en',
): Promise<any> {
  try {
    logger.log(
      `Gemini content visibility check: ${domain}, Query: "${query}" ${locale}`,
    );

    const model = getGeminiModel(
      options?.apiKey,
      options?.model || MODEL_NAMES.DEFAULT,
      options?.useGrounding ?? true,
    );

    const temperature = options?.temperature ?? 0.3;
    const startTime = Date.now();
    const prompt = PROMPTS.GEMINI.CHECK_VISIBILITY(domain, query, locale);

    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    };

    const result = await model.generateContent(request);
    const response = result.response;
    const text = response.text();

    // Pull grounding info if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources =
      groundingMetadata?.groundingChunks?.map((c: any) => c.web?.title) || [];

    const jsonResponse = parseJsonResponse<any>(
      text,
      'gemini-visibility-check',
    );

    const duration = Date.now() - startTime;
    logger.log(`Content visibility check completed in ${duration}ms`, {
      domain,
      query,
      sources: sources.length,
      domainPresent: jsonResponse.domainPresent,
    });

    return {
      ...jsonResponse,
      sources: [...new Set([...(jsonResponse.sources || []), ...sources])],
      duration,
      groundingMetadata: groundingMetadata || null,
      isVisible: jsonResponse.domainPresent,
      confidence: jsonResponse.confidence || 0,
    };
  } catch (error: any) {
    logger.error('Content visibility check error', error);
    throw error;
  }
}

export async function generatePotentialQueries(
  domain: string,
  locale: string = 'en',
  options?: {
    model?: string;
    temperature?: number;
    apiKey?: string;
    count?: number;
  },
): Promise<any> {
  try {
    logger.log(`Gemini generating potential queries: ${domain} ${locale}`);

    const model = getGeminiModel(
      options?.apiKey,
      options?.model || MODEL_NAMES.PRO_LATEST,
    );
    const count = options?.count || 15;
    const prompt = PROMPTS.GEMINI.GENERATE_QUERIES(domain, count, locale);

    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        responseMimeType: 'application/json',
      },
    };

    const text = await generateContentWithTimeout(
      model,
      request,
      'generatePotentialQueries',
    );

    try {
      const parsed = safeParse<any>(text);
      if (Array.isArray(parsed)) return { queries: parsed };
      if (Array.isArray(parsed?.queries)) return { queries: parsed.queries };
      return { queries: [] };
    } catch (e) {
      logger.warn('Gemini query response could not be parsed as JSON', {
        response: text,
      });
      return { queries: [], error: 'Query response could not be processed.' };
    }
  } catch (error) {
    logger.error('Gemini potential query generation error', error);
    throw new Error('Gemini potential query generation error');
  }
}

export async function generateText(
  prompt: string,
  options?: { model?: string; temperature?: number; apiKey?: string },
  locale: string = 'en',
): Promise<string> {
  try {
    logger.log(`Gemini generating text`, {
      promptLength: prompt.length,
    });

    const model = getGeminiModel(
      options?.apiKey,
      options?.model || MODEL_NAMES.DEFAULT,
      false,
    );
    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.5,
        maxOutputTokens: 256,
      },
    };

    const text = await generateContentWithTimeout(
      model,
      request,
      'generateText',
    );
    logger.log('Gemini text generated successfully');
    return stripFences(text);
  } catch (error: any) {
    logger.error('Gemini text generation error', error);
    throw new Error('Gemini text generation error');
  }
}

/** --- JSON-returning analyzers (all use responseMimeType) --- */

export async function analyzeBusinessModel(
  content: string,
  locale: string = 'en',
): Promise<any> {
  const context = 'gemini-analyzeBusinessModel';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_BUSINESS_MODEL(content, locale);

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<any>(text, context);
}

export async function analyzeTargetAudience(
  content: string,
  locale: string = 'en',
): Promise<any> {
  const context = 'gemini-analyzeTargetAudience';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_TARGET_AUDIENCE(content, locale);

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<any>(text, context);
}

export async function analyzeCompetitors(
  content: string,
  url: string,
  locale: string = 'en',
): Promise<any> {
  const context = 'gemini-analyzeCompetitors';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_COMPETITORS(content, url, locale);

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<any>(text, context);
}

export async function analyzeEEATSignals(
  content: string,
  sector: string,
  audience: string,
  locale: string = 'en',
): Promise<any> {
  const context = 'gemini-analyzeEEATSignals';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.GEMINI.ANALYZE_EEAT_SIGNALS(
    content,
    sector,
    audience,
    locale,
  );

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<any>(text, context);
}

export async function generateDelfiAgenda(
  prometheusReport: any,
  locale: string = 'en',
): Promise<any> {
  const context = 'gemini-generateDelfiAgenda';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const reportString =
    typeof prometheusReport === 'string'
      ? prometheusReport
      : JSON.stringify(prometheusReport, null, 2);
  const prompt = PROMPTS.GEMINI.GENERATE_DELFI_AGENDA(reportString, locale);

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<any>(text, context);
}

export async function generateGenerativePerformanceReport(
  content: string,
  competitors: string[],
  locale: string = 'en',
): Promise<any> {
  const context = 'gemini-generateGenerativePerformanceReport';
  const model = getGeminiModel(undefined, MODEL_NAMES.DEFAULT, false);
  const prompt = PROMPTS.OPENAI.GENERATE_GENERATIVE_PERFORMANCE_REPORT(
    content,
    competitors,
    locale,
  );

  const request: GenerateContentRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const text = await generateContentWithTimeout(model, request, context);
  return parseJsonResponse<any>(text, context);
}

export default {
  isGeminiConfigured,
  getGeminiModel,
  checkContentVisibility,
  generatePotentialQueries,
  analyzeBusinessModel,
  analyzeTargetAudience,
  analyzeCompetitors,
  analyzeEEATSignals,
  generateDelfiAgenda,
  generateGenerativePerformanceReport,
  MODEL_NAMES,
  GROUNDING_CONFIG,
};
