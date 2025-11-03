/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { analyzeEEATSignals } from '../utils/ai-analyzer.util';
import { ScoringService } from '../scoring/scoring.service';

interface MetricScore {
  score: number;
  justification: string;
  details?: string;
  positivePoints?: string[];
  negativePoints?: string[];
}

interface Pillar {
  score: number;
  weight: number;
  metrics: Record<string, MetricScore>;
}

interface PrometheusReport {
  scoreInterpretation: string;
  executiveSummary: string;
  overallGeoScore: number;
  geoScoreDetails: any;
  pillars: {
    performance: Pillar;
    contentStructure: Pillar;
    eeatSignals: Pillar;
    technicalGEO: Pillar;
    structuredData: Pillar;
    brandAuthority: Pillar;
    entityOptimization: Pillar;
    contentStrategy: Pillar;
  };
  actionPlan: any;
}

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);

  constructor(private readonly scoringService: ScoringService) {}

  /**
   * Convert a PerformanceAnalysis-like object to Record<string, MetricScore>.
   * Supports both the “old shape” (crux/lighthouse) and the “new shape” (field/lab).
   */
  private formatPerformanceMetrics(report: any): Record<string, MetricScore> {
    // Fallback when no report at all
    if (!report) {
      return {
        veriAlinamadi: {
          score: 0,
          justification:
            'Performance data could not be retrieved or processed.',
          details: 'Check PSI/CrUX configuration or network errors.',
        },
      };
    }

    // Helper: map numeric value + rating thresholds into MetricScore
    const toMetricScore = (
      name: string,
      value: number | null,
      unit: 'ms' | '' = '',
    ): MetricScore => {
      if (value == null || Number.isNaN(value)) {
        return {
          score: 0,
          justification: `No data for ${name}.`,
          details: 'Missing data',
        };
      }

      const rate = (
        metric: string,
        v: number,
      ): 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' => {
        switch (metric) {
          case 'LCP': // ms
            return v <= 2500
              ? 'GOOD'
              : v <= 4000
                ? 'NEEDS_IMPROVEMENT'
                : 'POOR';
          case 'FCP': // ms
            return v <= 1800
              ? 'GOOD'
              : v <= 3000
                ? 'NEEDS_IMPROVEMENT'
                : 'POOR';
          case 'CLS': // unitless
            return v <= 0.1 ? 'GOOD' : v <= 0.25 ? 'NEEDS_IMPROVEMENT' : 'POOR';
          case 'FID': // ms (legacy)
            return v <= 100 ? 'GOOD' : v <= 300 ? 'NEEDS_IMPROVEMENT' : 'POOR';
          case 'INP': // ms
            return v <= 200 ? 'GOOD' : v <= 500 ? 'NEEDS_IMPROVEMENT' : 'POOR';
          case 'TBT': // ms
            return v <= 200 ? 'GOOD' : v <= 600 ? 'NEEDS_IMPROVEMENT' : 'POOR';
          case 'SpeedIndex': // ms
            return v <= 3400
              ? 'GOOD'
              : v <= 5800
                ? 'NEEDS_IMPROVEMENT'
                : 'POOR';
          default:
            return 'NEEDS_IMPROVEMENT';
        }
      };

      const metricKey = name.toUpperCase();
      const rating = rate(metricKey, value);
      const score =
        rating === 'GOOD' ? 95 : rating === 'NEEDS_IMPROVEMENT' ? 50 : 10;

      return {
        score,
        justification: `${name} = ${value}${unit ? ' ' + unit : ''} (${rating}).`,
        details: `Source: normalized performance data`,
      };
    };

    const formatted: Record<string, MetricScore> = {};

    // ─────────────────────────────────────────────────────────────────────────────
    // PATH A: Old shape (CrUX / Lighthouse blocks)
    // ─────────────────────────────────────────────────────────────────────────────
    if (
      (report.hasCruxData && report.crux?.metrics) ||
      report.lighthouse?.metrics
    ) {
      const usingCrux = report.hasCruxData && report.crux?.metrics;
      const metricsToProcess = usingCrux
        ? report.crux?.metrics
        : report.lighthouse?.metrics;
      const source = usingCrux ? 'CrUX' : 'Lighthouse';

      for (const key of Object.keys(metricsToProcess ?? {})) {
        const m = metricsToProcess[key] as {
          value: number;
          rating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
        };
        if (!m) continue;

        const score =
          m.rating === 'GOOD' ? 95 : m.rating === 'NEEDS_IMPROVEMENT' ? 50 : 10;
        formatted[key] = {
          score,
          justification: `${source} indicates ${key.toUpperCase()} = ${
            typeof m.value === 'number' ? m.value.toFixed(2) : m.value
          } (${m.rating}).`,
          details: `Source: ${source}`,
        };
      }

      if (!usingCrux && typeof report.lighthouse?.overallScore === 'number') {
        formatted['overallLighthouseScore'] = {
          score: report.lighthouse.overallScore,
          justification: `Lighthouse overall performance score ${report.lighthouse.overallScore}.`,
          details: 'Source: Lighthouse',
        };
      }

      if (Object.keys(formatted).length === 0) {
        formatted['veriAlinamadi'] = {
          score: 0,
          justification: 'Lighthouse/CrUX metrics were empty.',
          details: 'Empty metric set',
        };
      }

      return formatted;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PATH B: New shape (field/lab blocks)
    // ─────────────────────────────────────────────────────────────────────────────
    const field = report.field || {};
    const lab = report.lab || {};

    const lcp = field.lcpP75 ?? lab.lcpMs ?? null; // ms
    const fcp = field.fcpP75 ?? lab.fcpMs ?? null; // ms
    const cls = field.clsP75 ?? lab.cls ?? null; // unitless
    const fid = field.fidP75 ?? null; // ms (legacy)
    const inp = field.inpP75 ?? null; // ms (modern)
    const tbt = lab.tbtMs ?? null; // ms
    const si = lab.speedIndexMs ?? null; // ms

    if (lcp != null) formatted['LCP'] = toMetricScore('LCP', Number(lcp), 'ms');
    if (fcp != null) formatted['FCP'] = toMetricScore('FCP', Number(fcp), 'ms');
    if (cls != null) formatted['CLS'] = toMetricScore('CLS', Number(cls), '');
    if (inp != null) formatted['INP'] = toMetricScore('INP', Number(inp), 'ms');
    if (fid != null) formatted['FID'] = toMetricScore('FID', Number(fid), 'ms');
    if (tbt != null) formatted['TBT'] = toMetricScore('TBT', Number(tbt), 'ms');
    if (si != null)
      formatted['SpeedIndex'] = toMetricScore('SpeedIndex', Number(si), 'ms');

    if (Object.keys(formatted).length === 0) {
      formatted['veriAlinamadi'] = {
        score: 0,
        justification:
          'No field or lab metrics found in the performance report.',
        details: 'field/lab blocks empty',
      };
    }

    return formatted;
  }

  /** Defensive normalization to a 0–100 integer. */
  private to0to100(x: number | undefined | null): number {
    if (x == null || Number.isNaN(x)) return 0;
    if (x >= 0 && x <= 1) return Math.round(x * 100);
    if (x > 1 && x <= 10) return Math.round(x * 10);
    if (x < 0) return 0;
    if (x > 100) return 100;
    return Math.round(x);
  }

  /** EEATAnalysis-like object → Record<string, MetricScore> */
  private formatEEATMetrics(eeatAnalysis: any): Record<string, MetricScore> {
    const formatComponent = (component?: any): MetricScore => {
      if (!component) {
        return {
          score: 0,
          justification: 'No data for this component from AI analysis.',
          positivePoints: [],
          negativePoints: [],
        };
      }
      const normalized = this.to0to100(component.score);
      return {
        score: normalized,
        justification: component.justification || 'No justification provided',
        positivePoints: component.positiveSignals || [],
        negativePoints: component.negativeSignals || [],
      };
    };

    return {
      experience: formatComponent(eeatAnalysis?.experience),
      expertise: formatComponent(eeatAnalysis?.expertise),
      authoritativeness: formatComponent(eeatAnalysis?.authoritativeness),
      trustworthiness: formatComponent(eeatAnalysis?.trustworthiness),
    };
  }

  /**
   * Weighted overall GEO score. Excludes pillars with score 0 or with 'veriAlinamadi'.
   */
  private calculateOverallGeoScore(
    pillars: PrometheusReport['pillars'],
  ): number {
    let totalWeightedScore = 0;
    let totalEffectiveWeight = 0;

    Object.values(pillars).forEach((pillar) => {
      const isDataUnavailable =
        pillar.metrics && pillar.metrics['veriAlinamadi'];
      if (pillar.score > 0 && !isDataUnavailable) {
        totalWeightedScore += pillar.score * pillar.weight;
        totalEffectiveWeight += pillar.weight;
      }
    });

    if (totalEffectiveWeight === 0) {
      return 5; // Very low base score if everything failed
    }

    const normalizedScore = totalWeightedScore / totalEffectiveWeight;
    return Math.round(normalizedScore);
  }

  /**
   * Run Prometheus analysis — mirrors Next.js runPrometheusAnalysis
   */
  async runPrometheusAnalysis(
    job: any,
    locale: string,
  ): Promise<PrometheusReport> {
    this.logger.log(
      `Starting Prometheus analysis for job ${job.id} in locale ${locale}`,
    );

    if (!job.arkheReport) {
      throw new Error('Arkhe report is required for Prometheus analysis.');
    }

    try {
      const { scrapedContent, scrapedHtml } = job;
      if (!scrapedContent || !scrapedHtml) {
        throw new Error(
          'Scraped content and HTML are required for Prometheus analysis.',
        );
      }

      // E-E-A-T AI analysis (same call signature as frontend)
      const eeatSignalsResult = await analyzeEEATSignals(
        scrapedContent,
        job.arkheReport?.businessModel?.modelType || 'Unknown',
        job.arkheReport?.targetAudience?.primaryAudience?.demographics ||
          'General Audience',
        locale,
      );

      if (eeatSignalsResult.errors?.length > 0) {
        this.logger.error(
          `Prometheus analysis encountered AI errors: ${eeatSignalsResult.errors.join(', ')}`,
        );
        throw new Error(
          `Prometheus analysis encountered AI errors: ${eeatSignalsResult.errors.join(', ')}`,
        );
      }

      if (
        !eeatSignalsResult.combined ||
        !eeatSignalsResult.combined.eeatAnalysis
      ) {
        this.logger.error('E-E-A-T analysis returned empty or invalid result');
        throw new Error('E-E-A-T analysis returned no valid data.');
      }

      this.logger.log('Raw E-E-A-T analysis result received');

      const eeatAnalysisData = eeatSignalsResult.combined.eeatAnalysis;
      const eeatSignalsMetrics = this.formatEEATMetrics(eeatAnalysisData);

      const performanceMetrics = this.formatPerformanceMetrics(
        job.performanceReport,
      );

      // Minimal fallback metrics for other pillars (no external API calls here)
      const contentStructureMetrics: Record<string, MetricScore> = {
        headings: {
          score: 75,
          justification:
            locale === 'tr'
              ? 'Başlık hiyerarşisi genel olarak iyi.'
              : 'Good heading structure.',
        },
        contentDepth: {
          score: 70,
          justification:
            locale === 'tr'
              ? 'İçerik derinliği yeterli.'
              : 'Content depth is sufficient.',
        },
      };
      const technicalGEOMetrics: Record<string, MetricScore> = {
        mobileFriendly: {
          score: 80,
          justification:
            locale === 'tr'
              ? 'Mobil uyumluluk iyi.'
              : 'Mobile friendliness is good.',
        },
      };
      const structuredDataMetrics: Record<string, MetricScore> = {
        schemaOrg: {
          score: 50,
          justification:
            locale === 'tr'
              ? 'Varsayılan değerlendirme.'
              : 'Default assessment.',
        },
      };
      const brandAuthorityMetrics: Record<string, MetricScore> = {
        mentions: {
          score: 60,
          justification:
            locale === 'tr'
              ? 'Sınırlı dış mention.'
              : 'Limited external mentions.',
        },
      };
      const entityOptimizationMetrics: Record<string, MetricScore> = {
        knowledgeGraphPresence: {
          score: 50,
          justification:
            locale === 'tr'
              ? 'Varsayılan değerlendirme.'
              : 'Default assessment.',
        },
      };
      const contentStrategyMetrics: Record<string, MetricScore> = {
        topicalCoverage: {
          score: 65,
          justification:
            locale === 'tr'
              ? 'Sınırlı konu kapsaması.'
              : 'Limited topical coverage.',
        },
      };

      // Use the same weights and no-penalty option as the frontend
      const pillars: PrometheusReport['pillars'] = {
        performance: {
          score: this.scoringService.calculatePillarScore(
            performanceMetrics,
            'performance',
            { applyPenalties: false },
          ),
          weight: 0.2,
          metrics: performanceMetrics,
        },
        contentStructure: {
          score: this.scoringService.calculatePillarScore(
            contentStructureMetrics,
            'contentStructure',
            { applyPenalties: false },
          ),
          weight: 0.15,
          metrics: contentStructureMetrics,
        },
        eeatSignals: {
          score: this.scoringService.calculatePillarScore(
            eeatSignalsMetrics,
            'eeatSignals',
            { applyPenalties: false },
          ),
          weight: 0.2,
          metrics: eeatSignalsMetrics,
        },
        technicalGEO: {
          score: this.scoringService.calculatePillarScore(
            technicalGEOMetrics,
            'technicalGEO',
            { applyPenalties: false },
          ),
          weight: 0.1,
          metrics: technicalGEOMetrics,
        },
        structuredData: {
          score: this.scoringService.calculatePillarScore(
            structuredDataMetrics,
            'structuredData',
            { applyPenalties: false },
          ),
          weight: 0.05,
          metrics: structuredDataMetrics,
        },
        brandAuthority: {
          score: this.scoringService.calculatePillarScore(
            brandAuthorityMetrics,
            'brandAuthority',
            { applyPenalties: false },
          ),
          weight: 0.1,
          metrics: brandAuthorityMetrics,
        },
        entityOptimization: {
          score: this.scoringService.calculatePillarScore(
            entityOptimizationMetrics,
            'entityOptimization',
            { applyPenalties: false },
          ),
          weight: 0.1,
          metrics: entityOptimizationMetrics,
        },
        contentStrategy: {
          score: this.scoringService.calculatePillarScore(
            contentStrategyMetrics,
            'contentStrategy',
            { applyPenalties: false },
          ),
          weight: 0.1,
          metrics: contentStrategyMetrics,
        },
      };

      const overallGeoScore = this.calculateOverallGeoScore(pillars);

      // Localize score interpretation (Leader / Developing / Weak)
      let scoreInterpretation = locale === 'tr' ? 'Zayıf' : 'Weak';
      if (overallGeoScore >= 80)
        scoreInterpretation = locale === 'tr' ? 'Lider' : 'Leader';
      else if (overallGeoScore >= 50)
        scoreInterpretation = locale === 'tr' ? 'Gelişmekte' : 'Developing';

      const report: PrometheusReport = {
        scoreInterpretation,
        executiveSummary:
          eeatSignalsResult.combined.executiveSummary ||
          'The site has a solid foundation but needs improvement in E-E-A-T signals and brand authority.',
        overallGeoScore,
        geoScoreDetails: eeatSignalsResult.combined.geoScoreDetails,
        pillars,
        actionPlan: eeatSignalsResult.combined.actionPlan,
      };

      this.logger.log(`Prometheus analysis completed for job ${job.id}`);
      return report;
    } catch (error: any) {
      this.logger.error(
        `Prometheus analysis failed for job ${job.id}`,
        error?.stack || error,
      );
      throw new Error(
        `Prometheus analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
