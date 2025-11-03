import { OpenAI } from 'openai';
import { Logger } from '@nestjs/common';

const logger = new Logger('OpenAIUtil');
import { PROMPTS } from '../utils/prompts.util';

// Model names (Cost optimized to gpt-4o-mini)
export const MODEL_NAMES = {
  DEFAULT: 'gpt-4o-mini',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
};

// Lazy initialization for client variable
let openai: OpenAI | null = null;

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY; // ← dynamic read
}

export function getOpenAIInstance(): OpenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'The OPENAI_API_KEY environment variable is missing or empty.',
    );
  }
  if (!openai) {
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export function isOpenAIConfigured(): boolean {
  return !!getApiKey();
}

export async function checkContentVisibility(
  url: string,
  query: string,
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.CHECK_VISIBILITY(url, query, '', locale);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('OpenAI returned an empty response.');
    }

    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in checkContentVisibility', error);
    throw new Error('Failed to check content visibility.');
  }
}

export async function generatePotentialQueries(
  domain: string,
  locale: string = 'en',
  options?: {
    model?: string;
    apiKey?: string;
    count?: number;
  },
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const count = options?.count || 15;
    const model = options?.model || MODEL_NAMES.DEFAULT;
    const systemPrompt = PROMPTS.OPENAI.GENERATE_QUERIES(domain, count, locale);

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} queries for ${domain}.` },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response for queries.');
    }
    return JSON.parse(content);
  } catch (error) {
    logger.error('Error in generatePotentialQueries', error);
    throw new Error('Failed to generate potential queries.');
  }
}

export async function analyzeBusinessModel(
  content: string,
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_BUSINESS_MODEL(content, locale);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error(
        'OpenAI returned an empty response for business model analysis.',
      );
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeBusinessModel', error);
    throw new Error('Failed to analyze business model with OpenAI.');
  }
}

export async function analyzeTargetAudience(
  content: string,
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_TARGET_AUDIENCE(content, locale);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error(
        'OpenAI returned an empty response for target audience analysis.',
      );
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeTargetAudience', error);
    throw new Error('Failed to analyze target audience with OpenAI.');
  }
}

export async function analyzeCompetitors(
  content: string,
  url: string,
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_COMPETITORS(content, url, locale);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error(
        'OpenAI returned an empty response for competitor analysis.',
      );
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeCompetitors', error);
    throw new Error('Failed to analyze competitors with OpenAI.');
  }
}

export async function analyzeEEATSignals(
  content: string,
  sector: string,
  audience: string,
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.ANALYZE_EEAT_SIGNALS(
      content,
      sector,
      audience,
      locale,
    );

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error(
        'OpenAI returned an empty response for E-E-A-T analysis.',
      );
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in analyzeEEATSignals', error);
    throw new Error('Failed to analyze E-E-A-T signals with OpenAI.');
  }
}

export async function generateDelfiAgenda(
  prometheusReport: any,
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const reportString =
      typeof prometheusReport === 'string'
        ? prometheusReport
        : JSON.stringify(prometheusReport, null, 2);

    const prompt = PROMPTS.OPENAI.GENERATE_DELFI_AGENDA(reportString, locale);

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error(
        'OpenAI returned an empty response for Delfi agenda generation.',
      );
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in generateDelfiAgenda', error);
    throw new Error('Failed to generate Delfi agenda with OpenAI.');
  }
}

export async function generateGenerativePerformanceReport(
  content: string,
  competitors: string[],
  locale: string = 'en',
): Promise<any> {
  try {
    const client = getOpenAIInstance();
    const prompt = PROMPTS.OPENAI.GENERATE_GENERATIVE_PERFORMANCE_REPORT(
      content,
      competitors,
      locale,
    );

    const response = await client.chat.completions.create({
      model: MODEL_NAMES.DEFAULT,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error(
        'OpenAI returned an empty response for generative performance report.',
      );
    }
    return JSON.parse(responseContent);
  } catch (error) {
    logger.error('Error in generateGenerativePerformanceReport', error);
    throw new Error(
      'Failed to generate generative performance report with OpenAI.',
    );
  }
}

export default {
  isOpenAIConfigured,
  checkContentVisibility,
  generatePotentialQueries,
  analyzeBusinessModel,
  analyzeTargetAudience,
  analyzeCompetitors,
  analyzeEEATSignals,
  generateDelfiAgenda,
  generateGenerativePerformanceReport,
  MODEL_NAMES,
};
