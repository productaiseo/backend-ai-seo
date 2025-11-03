/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import {
  analyzeBusinessModel,
  analyzeTargetAudience,
  analyzeCompetitors,
} from '../utils/ai-analyzer.util';

export interface ScrapeResult {
  html: string;
  content: string;
  robotsTxt?: string;
  llmsTxt?: string;
  performanceMetrics?: any;
}

export interface ArkheReport {
  businessModel: any;
  targetAudience: any;
  competitors: any;
}

@Injectable()
export class ArkheService {
  private readonly logger = new Logger(ArkheService.name);

  /**
   * Optimized Arkhe analysis - accepts pre-scraped data instead of re-scraping
   * @param job - The analysis job
   * @param scrapedData - Pre-scraped data from Playwright (passed from orchestrator)
   * @param locale - The locale for analysis
   */
  async runArkheAnalysis(
    job: any,
    scrapedData: ScrapeResult,
    locale: string,
  ): Promise<ArkheReport | { error: string }> {
    this.logger.log(`Starting Arkhe analysis for job ${job.id}`, {
      url: job.url,
      locale,
      contentLength: scrapedData.content?.length || 0,
    });

    try {
      const { html, content, robotsTxt, llmsTxt } = scrapedData;

      // Validate scraped content
      if (!content || content.trim().length < 100) {
        throw new Error('Scraped content is insufficient for Arkhe analysis.');
      }

      this.logger.log(
        `Arkhe analysis using pre-scraped content (${content.length} chars)`,
      );
      this.logger.log(`locale in arkhe: ${locale}`);

      const [businessModelResult, targetAudienceResult, competitorsResult] =
        await Promise.all([
          analyzeBusinessModel(content, locale),
          analyzeTargetAudience(content, locale),
          analyzeCompetitors(content, job.url, locale),
        ]);

      // Validate that at least the combined results exist
      const ok =
        businessModelResult?.combined &&
        targetAudienceResult?.combined &&
        competitorsResult?.combined;

      if (!ok) {
        throw new Error(
          'Arkhe analysis encountered AI errors - missing combined results.',
        );
      }

      const report: ArkheReport = {
        businessModel: businessModelResult?.combined,
        targetAudience: targetAudienceResult?.combined,
        competitors: competitorsResult?.combined,
      };

      this.logger.log(
        `Arkhe analysis completed successfully for job ${job.id}`,
        {
          hasBusinessModel: !!report.businessModel,
          hasTargetAudience: !!report.targetAudience,
          hasCompetitors: !!report.competitors,
        },
      );

      return report;
    } catch (error: any) {
      this.logger.error(
        `Arkhe analysis failed for job ${job.id}: ${error?.message}`,
        error,
      );
      return { error: error?.message || 'Arkhe analysis failed' };
    }
  }
}
