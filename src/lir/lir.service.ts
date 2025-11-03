import { Injectable, Logger } from '@nestjs/common';
import { generateDelfiAgenda } from '../utils/ai-analyzer.util';

@Injectable()
export class LirService {
  private readonly logger = new Logger(LirService.name);

  /**
   * Run Lir (Delfi Agenda) analysis
   */
  async runLirAnalysis(prometheusReport: any, locale: string): Promise<any> {
    this.logger.log(`Starting Lir analysis in locale: ${locale}`);

    if (!prometheusReport) {
      throw new Error('Prometheus report is required for Lir analysis.');
    }

    try {
      const delfiAgendaResult = await generateDelfiAgenda(
        prometheusReport,
        locale,
      );

      if (delfiAgendaResult.errors.length > 0) {
        this.logger.error(
          `Lir analysis encountered AI errors: ${delfiAgendaResult.errors.join(', ')}`,
        );
        throw new Error(
          `Lir analysis encountered AI errors: ${delfiAgendaResult.errors.join(', ')}`,
        );
      }

      this.logger.log(`Lir analysis completed successfully`);
      return delfiAgendaResult.combined;
    } catch (error) {
      this.logger.error(`Lir analysis failed`, error);
      throw new Error(
        `Lir analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
