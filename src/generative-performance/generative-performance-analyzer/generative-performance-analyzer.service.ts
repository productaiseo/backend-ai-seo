import { Injectable, Logger } from '@nestjs/common';
import { PROMPTS } from '../../utils/prompts.util';
import { getOpenAIInstance } from '../../utils/openai.util';

export type SentimentTrend = 'positive' | 'neutral' | 'negative' | 'mixed';

export interface SoGVCompetitorScore {
  name: string;
  score: number; // 0..100
}

export interface SoGVMetrics {
  score: number; // 0..100
  competitors: SoGVCompetitorScore[];
  mentions: number;
}

export interface CitationMetrics {
  citationRate: number; // 0..100
  citations: number;
  topCitedUrls: string[];
}

export interface SentimentMetrics {
  positive: number;
  neutral: number;
  negative: number;
  sentimentTrend: SentimentTrend;
}

export interface HallucinationExample {
  claim: string;
  sourceText: string;
  verificationResult: 'verified' | 'unverified' | 'contradictory';
  explanation: string;
}

export interface HallucinationMetrics {
  accuracyScore: number; // 0..100
  examples: HallucinationExample[];
}

@Injectable()
export class GenerativePerformanceAnalyzerService {
  private readonly logger = new Logger(
    GenerativePerformanceAnalyzerService.name,
  );

  private async analyzeWithAI<T>(
    prompt: string,
    model = 'gpt-4o-mini',
  ): Promise<T> {
    try {
      const openai = getOpenAIInstance();
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI returned an empty response.');
      }
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error('Error in AI analysis', error);
      throw new Error('Failed to analyze with AI.');
    }
  }

  calculateSoGVMetrics(
    aiResponses: string[],
    targetBrand: string,
    targetDomain: string,
    competitors: string[],
  ): { sogv: SoGVMetrics; citation: CitationMetrics } {
    let mentions = 0;
    let citations = 0;
    const topCitedUrls: string[] = [];

    const targetBrandLower = (targetBrand || '').toLowerCase();
    const targetDomainLower = (targetDomain || '').toLowerCase();

    aiResponses.forEach((response) => {
      const responseLower = (response || '').toLowerCase();
      if (targetBrandLower && responseLower.includes(targetBrandLower)) {
        mentions++;
      }
      if (targetDomainLower && responseLower.includes(targetDomainLower)) {
        citations++;
        // Simple URL extraction (can be improved later)
        const urlRegex = new RegExp(
          `https?:\\/\\/[^\\s/$.?#].[^\\s]*${this.escapeForRegex(targetDomainLower)}[^\\s]*`,
          'gi',
        );
        const foundUrls = response.match(urlRegex);
        if (foundUrls) topCitedUrls.push(...foundUrls);
      }
    });

    const totalQueries = aiResponses.length || 1;
    const sogvScore = (mentions / totalQueries) * 100;
    const citationRate = (citations / totalQueries) * 100;

    const competitorScores: SoGVCompetitorScore[] = competitors.map((name) => {
      const competitorMentions = aiResponses.filter((r) =>
        (r || '').toLowerCase().includes((name || '').toLowerCase()),
      ).length;
      const score = (competitorMentions / totalQueries) * 100;
      return { name, score: Math.round(score) };
    });

    return {
      sogv: {
        score: sogvScore,
        competitors: competitorScores,
        mentions,
      },
      citation: {
        citationRate,
        citations,
        topCitedUrls: [...new Set(topCitedUrls)].slice(0, 5), // unique, top 5
      },
    };
  }

  async analyzeSentiment(texts: string[]): Promise<SentimentMetrics> {
    const combinedText = texts.join(' ').substring(0, 4000);
    const prompt = PROMPTS.OPENAI.ANALYZE_SENTIMENT(combinedText);

    const result = await this.analyzeWithAI<{
      positive: string | number;
      neutral: string | number;
      negative: string | number;
    }>(prompt);

    const positive = Number(result.positive);
    const neutral = Number(result.neutral);
    const negative = Number(result.negative);

    if (
      Number.isNaN(positive) ||
      Number.isNaN(neutral) ||
      Number.isNaN(negative)
    ) {
      this.logger.warn(
        'AI returned non-numeric sentiment values',
        result as any,
      );
      throw new Error('AI returned non-numeric sentiment values.');
    }

    let sentimentTrend: SentimentTrend = 'neutral';

    if (positive > neutral && positive > negative) {
      sentimentTrend = 'positive';
    } else if (negative > positive && negative > neutral) {
      sentimentTrend = 'negative';
    } else if (Math.abs(positive - negative) < 10) {
      sentimentTrend = 'mixed';
    }

    return { positive, neutral, negative, sentimentTrend };
  }

  async extractClaimsFromResponses(aiResponses: string[]): Promise<string[]> {
    const combinedResponses = aiResponses.join(' ');
    const prompt = PROMPTS.OPENAI.EXTRACT_CLAIMS(combinedResponses);
    const result = await this.analyzeWithAI<{ claims: string[] }>(prompt);
    return result.claims || [];
  }

  async verifyClaimsWithRAG(
    claims: string[],
    groundTruth: string,
  ): Promise<HallucinationMetrics> {
    if (!claims?.length) {
      return { accuracyScore: 100, examples: [] };
    }

    const prompt = PROMPTS.OPENAI.VERIFY_CLAIMS(claims, groundTruth);
    const result = await this.analyzeWithAI<{
      examples: Array<{
        claim: string;
        sourceText: string;
        verificationResult: 'verified' | 'unverified' | 'contradictory';
        explanation: string;
      }>;
    }>(prompt);

    const examples = result.examples || [];
    const verifiedCount = examples.filter(
      (e) => e.verificationResult === 'verified',
    ).length;
    const accuracyScore = examples.length
      ? (verifiedCount / examples.length) * 100
      : 100;

    return {
      accuracyScore: Math.round(accuracyScore),
      examples,
    };
  }

  // helper to escape special regex characters in a string
  private escapeForRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
