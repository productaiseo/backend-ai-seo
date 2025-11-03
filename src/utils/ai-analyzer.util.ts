/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as openai from './openai.util';
import * as gemini from './gemini.util';

export interface AggregatedAnalysisResult<T> {
  openai?: {
    platform: 'OpenAI';
    model: string;
    duration: number;
    data: T;
  };
  gemini?: {
    platform: 'Gemini';
    model: string;
    duration: number;
    data: T;
  };
  combined: T;
  errors: string[];
}

export interface BusinessModelResult {
  combined: any;
}

export interface TargetAudienceResult {
  combined: any;
}

export interface CompetitorsResult {
  combined: any;
}

type AnyFn = (...args: any[]) => Promise<any>;

function now() {
  return Date.now();
}

async function tryCall<T>(
  label: 'OpenAI' | 'Gemini',
  modelName: string,
  fn: AnyFn,
  args: any[],
): Promise<{
  res?: {
    platform: 'OpenAI' | 'Gemini';
    model: string;
    duration: number;
    data: T;
  };
  err?: string;
}> {
  const start = now();
  try {
    const data = await fn(...args);
    const duration = now() - start;
    return { res: { platform: label, model: modelName, duration, data } };
  } catch (e: any) {
    const duration = now() - start;
    const msg = `${label} error after ${duration}ms: ${e?.message || e}`;
    return { err: msg };
  }
}

async function aggregateDual<T>(
  fnName: keyof typeof openai,
  args: any[],
): Promise<AggregatedAnalysisResult<T>> {
  const errors: string[] = [];
  let openaiResult: any;
  let geminiResult: any;

  const openaiFn: AnyFn | undefined = (openai as any)[fnName];
  const geminiFn: AnyFn | undefined = (gemini as any)[fnName];
  const openaiConfiguredFlag = (openai as any).isOpenAIConfigured?.() ?? true;
  const geminiConfiguredFlag = (gemini as any).isGeminiConfigured?.() ?? true;
  const openaiConfigured =
    openaiConfiguredFlag && typeof openaiFn === 'function';
  const geminiConfigured =
    geminiConfiguredFlag && typeof geminiFn === 'function';

  if (!openaiConfigured && !geminiConfigured) {
    throw new Error('All AI platforms failed - no API keys configured');
  }

  // Try OpenAI
  if (openaiConfigured) {
    const modelName = (openai as any).MODEL_NAMES?.DEFAULT || 'openai-default';
    const { res, err } = await tryCall<T>('OpenAI', modelName, openaiFn, args);
    if (res) openaiResult = res;
    else if (err) errors.push(err);
  }

  // Try Gemini
  if (geminiConfigured) {
    const modelName = (gemini as any).MODEL_NAMES?.DEFAULT || 'gemini-default';
    const { res, err } = await tryCall<T>('Gemini', modelName, geminiFn, args);
    if (res) geminiResult = res;
    else if (err) errors.push(err);
  }

  const combined = (openaiResult?.data ?? geminiResult?.data) as T;
  if (!combined) {
    throw new Error('All AI platforms failed: ' + errors.join('; '));
  }

  return {
    openai: openaiResult,
    gemini: geminiResult,
    combined,
    errors,
  } as AggregatedAnalysisResult<T>;
}

export async function analyzeBusinessModel(
  content: string,
  locale: string,
): Promise<AggregatedAnalysisResult<any>> {
  return aggregateDual<any>('analyzeBusinessModel', [content, locale]);
}

export async function analyzeTargetAudience(
  content: string,
  locale: string,
): Promise<AggregatedAnalysisResult<any>> {
  return aggregateDual<any>('analyzeTargetAudience', [content, locale]);
}

export async function analyzeCompetitors(
  content: string,
  url: string,
  locale: string,
): Promise<AggregatedAnalysisResult<any>> {
  return aggregateDual<any>('analyzeCompetitors', [content, url, locale]);
}

export async function analyzeEEATSignals(
  content: string,
  sector: string,
  audience: string,
  locale: string,
): Promise<AggregatedAnalysisResult<any>> {
  return aggregateDual<any>('analyzeEEATSignals', [
    content,
    sector,
    audience,
    locale,
  ]);
}

export async function generateDelfiAgenda(
  prometheusReport: any,
  locale: string,
): Promise<AggregatedAnalysisResult<any>> {
  return aggregateDual<any>('generateDelfiAgenda', [prometheusReport, locale]);
}
