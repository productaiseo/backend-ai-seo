/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { GenerativePerformanceAnalyzerService } from './generative-performance-analyzer/generative-performance-analyzer.service';
import { getAiResponsesForQueries } from '../utils/ai-search.util';

@Injectable()
export class GenerativePerformanceService {
  private readonly logger = new Logger(GenerativePerformanceService.name);

  constructor(
    private readonly genPerfAnalyzerService: GenerativePerformanceAnalyzerService,
  ) {}

  async runGenerativePerformanceAnalysis(
    job: any,
    targetBrand: string,
  ): Promise<any> {
    this.logger.log(
      `Starting Generative Performance analysis for job ${job.id}`,
    );

    if (
      !job?.arkheReport ||
      !job.arkheReport?.competitors?.businessCompetitors
    ) {
      throw new Error('Arkhe report with competitors is required.');
    }
    if (!job?.scrapedContent) {
      throw new Error('Scraped content is required for RAG analysis.');
    }

    try {
      // 1) Collect AI responses for top queries (simulated helper)
      const topQueries: string[] = job.topQueries?.map((q: any) => q.query) || [
        `what is ${targetBrand}`,
      ];
      const aiResponses: string[] = await getAiResponsesForQueries(
        topQueries,
        job.url,
      );

      // 2) SoGV & citation analysis
      const competitors: string[] =
        job.arkheReport.competitors.businessCompetitors.map((c: any) => c.name);
      const { sogv, citation } =
        this.genPerfAnalyzerService.calculateSoGVMetrics(
          aiResponses,
          targetBrand,
          job.url,
          competitors,
        );

      // 3) Sentiment analysis
      const sentimentAnalysis =
        await this.genPerfAnalyzerService.analyzeSentiment(aiResponses);

      // 4) Accuracy & hallucination (RAG verification against scraped content)
      const claims =
        await this.genPerfAnalyzerService.extractClaimsFromResponses(
          aiResponses,
        );
      const accuracyAndHallucination =
        await this.genPerfAnalyzerService.verifyClaimsWithRAG(
          claims,
          job.scrapedContent,
        );

      const report = {
        shareOfGenerativeVoice: sogv,
        citationAnalysis: citation,
        sentimentAnalysis,
        accuracyAndHallucination,
      };

      this.logger.log(
        `Generative Performance analysis completed for job ${job.id}`,
      );
      return report;
    } catch (error: any) {
      this.logger.error(
        `Generative Performance analysis failed for job ${job.id}`,
        error?.stack || error,
      );
      throw new Error(
        `Generative Performance analysis failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
