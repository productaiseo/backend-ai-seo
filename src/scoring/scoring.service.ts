import { Injectable, Logger } from '@nestjs/common';

export interface MetricScore {
  score: number;
  justification: string;
  details?: string;
  positivePoints?: string[];
  negativePoints?: string[];
}

export interface SubcomponentScore {
  name: string;
  score: number | null | undefined;
  weight: number; // 0..1 expected
}

const metricWeights: Record<string, number> = {
  knowledgeGraphPresence: 0.5,
  entityReconciliation: 0.25,
  entityCompleteness: 0.25,
};

type PillarScoreOptions = {
  /** Matches frontend default (true) to keep old behavior unless explicitly disabled */
  applyPenalties?: boolean;
};

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  calculatePillarScore(
    metrics: Record<string, MetricScore>,
    pillarName: string,
    options: PillarScoreOptions = { applyPenalties: true },
  ): number {
    const metricEntries = Object.entries(metrics).filter(
      ([key]) => key !== 'overallLighthouseScore',
    );
    if (metricEntries.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    const hasSpecialWeights = metricEntries.some(([key]) => metricWeights[key]);

    if (hasSpecialWeights) {
      metricEntries.forEach(([key, m]) => {
        const weight = metricWeights[key] || 0;
        if (weight > 0) {
          totalScore += m.score * weight;
          totalWeight += weight;
        }
      });
      if (totalWeight === 0) {
        totalScore = metricEntries.reduce((sum, [, m]) => sum + m.score, 0);
        totalWeight = metricEntries.length;
      }
    } else {
      totalScore = metricEntries.reduce((sum, [, m]) => sum + m.score, 0);
      totalWeight = metricEntries.length;
    }

    if (totalWeight === 0) return 0;

    let finalScore = totalScore / totalWeight;

    // ── Optional penalties (same as frontend) ─────────────────────────
    if (options.applyPenalties) {
      const negativeCount = metricEntries.reduce(
        (acc, [, m]) => acc + (m.negativePoints?.length || 0),
        0,
      );
      if (negativeCount > 0) finalScore -= negativeCount * 5;

      const needsImprovementCount = metricEntries.reduce(
        (acc, [, m]) =>
          acc + (m.justification?.includes('NEEDS_IMPROVEMENT') ? 1 : 0),
        0,
      );
      const poorCount = metricEntries.reduce(
        (acc, [, m]) => acc + (m.justification?.includes('POOR') ? 1 : 0),
        0,
      );
      finalScore -= needsImprovementCount * 5;
      finalScore -= poorCount * 10;
    }
    // ──────────────────────────────────────────────────────────────────

    if (finalScore < 0) finalScore = 0;
    if (finalScore > 100) finalScore = 100;
    return Math.round(finalScore);
  }

  /**
   * Identical logic to Next.js scoringEngine.calculateResilientScore
   * Weighted average over valid subcomponents.
   */
  calculateResilientScore(subcomponents: SubcomponentScore[]): number {
    const valid = subcomponents.filter(
      (sc) => sc.score !== null && sc.score !== undefined,
    );
    if (valid.length === 0) return 0;

    const totalWeight = valid.reduce((sum, sc) => sum + sc.weight, 0);
    if (totalWeight === 0) return 0;

    const weighted = valid.reduce(
      (sum, sc) => sum + (sc.score as number) * sc.weight,
      0,
    );
    return weighted / totalWeight;
  }
}
