/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AnalysisJob,
  AnalysisJobDocument,
} from '../schemas/AnalysisJob.schema';
import { JobEvent, JobEventDocument } from '../schemas/JobEvent.schema';
import { ScraperService } from '../scraper/scraper.service';
import { PerformanceService } from '../performance/performance.service';
import { ArkheService } from '../arkhe/arkhe.service';
import { PrometheusService } from '../prometheus/prometheus.service';
import { GenerativePerformanceService } from '../generative-performance/generative-performance.service';
import { LirService } from '../lir/lir.service';
import { DatabaseService } from '../database/database.service';

/** Utility: remove undefined recursively */
function cleanUndefined<T>(v: T): T {
  if (Array.isArray(v))
    return v.map(cleanUndefined).filter((x) => x !== undefined) as any;
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const [k, val] of Object.entries(v as any)) {
      const sv = cleanUndefined(val as any);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }
  return v;
}

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    @InjectModel(AnalysisJob.name)
    private readonly analysisJobModel: Model<AnalysisJobDocument>,
    @InjectModel(JobEvent.name)
    private readonly jobEventModel: Model<JobEventDocument>,
    private readonly scraperService: ScraperService,
    private readonly performanceService: PerformanceService,
    private readonly arkheService: ArkheService,
    private readonly prometheusService: PrometheusService,
    private readonly genPerfService: GenerativePerformanceService,
    private readonly lirService: LirService,
    private readonly databaseService: DatabaseService,
  ) {}

  /** Persist job updates in Mongo */
  private async updateJob(job: any, updates: Partial<any>): Promise<any> {
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const payload = cleanUndefined(updatesWithTimestamp);

    await this.analysisJobModel
      .updateOne({ id: job.id }, { $set: payload }, { upsert: true })
      .exec();

    if (updates.status) {
      this.logger.log(
        `[Orchestrator] Job ${job.id} status updated to: ${updates.status}`,
      );
    }

    return { ...job, ...updatesWithTimestamp };
  }

  /** Append job event for tracking */
  private async appendJobEvent(
    jobId: string,
    event: {
      step: string;
      status: 'STARTED' | 'COMPLETED' | 'FAILED';
      meta?: any;
    },
  ) {
    try {
      await this.jobEventModel.create({
        jobId,
        step: event.step,
        status: event.status,
        meta: event.meta ?? null,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn(
        `appendJobEvent failed (non-fatal) for jobId: ${jobId}`,
        (e as Error)?.message,
      );
    }
  }

  /**
   * RESILIENT orchestration: Continue even if steps fail
   * Strategy: Store error reports for failed steps, complete what we can
   */
  async orchestrateAnalysis(job: any): Promise<void> {
    const { id, url, locale } = job;

    this.logger.log(`orchestrateAnalysis locale: ${locale}`);

    if (!id || !url) {
      throw new Error('Job must have id and url');
    }

    this.logger.log(`[Orchestrator] Environment:`, {
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[Orchestrator] Analysis initiated: ${id} - ${url}`);

    const heartbeat = setInterval(() => {
      this.logger.log(`[Orchestrator] Heartbeat for job ${id}`);
    }, 10000);

    // Track which steps completed successfully
    let hasScrapedData = false;
    let hasArkheData = false;
    let hasPrometheusData = false;

    try {
      // If this orchestrator is called, we know the job needs processing
      this.logger.log(`[Orchestrator] Starting analysis for job ${id}`);

      try {
        await this.appendJobEvent(id, { step: 'INIT', status: 'COMPLETED' });
      } catch {}

      // PHASE 1: SCRAPE (Critical - but continue if fails)
      job = await this.updateJob(job, { status: 'PROCESSING_SCRAPE' });
      try {
        await this.appendJobEvent(id, { step: 'SCRAPE', status: 'STARTED' });
      } catch {}

      let scrapedContent = '';
      let scrapedHtml = '';
      let scrapedData: any = null;

      try {
        this.logger.log(`[Orchestrator] Starting Playwright scrape for ${url}`);

        scrapedData = await this.scraperService.playwrightScraper(url);
        scrapedContent = scrapedData.content || '';
        scrapedHtml = scrapedData.html || '';

        this.logger.log(
          `[Orchestrator] Scrape completed. Content length: ${scrapedContent.length}`,
        );
        job = await this.updateJob(job, { scrapedContent, scrapedHtml });
        try {
          await this.appendJobEvent(id, {
            step: 'SCRAPE',
            status: 'COMPLETED',
          });
        } catch {}
        hasScrapedData = true;
      } catch (e: any) {
        this.logger.error(
          `[Orchestrator] Scraping failed, continuing with empty data: ${e.message}`,
        );
        job = await this.updateJob(job, {
          scrapedContent: '',
          scrapedHtml: '',
          scrapeError: e?.message || 'Scraping failed',
        } as any);
        try {
          await this.appendJobEvent(id, {
            step: 'SCRAPE',
            status: 'FAILED',
            meta: { message: e?.message },
          });
        } catch {}
        // Continue anyway - some analyses might work with URL alone
      }

      // PHASE 2: PARALLEL - Arkhe + Performance
      this.logger.log(`[Orchestrator] Starting parallel: Arkhe + Performance`);

      const [arkheResult, performanceResult] = await Promise.allSettled([
        // ARKHE
        (async () => {
          job = await this.updateJob(job, { status: 'PROCESSING_ARKHE' });
          try {
            await this.appendJobEvent(id, {
              step: 'ARKHE',
              status: 'STARTED',
            });
          } catch {}

          try {
            if (!hasScrapedData) {
              throw new Error('No scraped data available');
            }

            this.logger.log(`[Orchestrator] Starting Arkhe analysis`);
            const arkheAnalysisResult =
              await this.arkheService.runArkheAnalysis(
                job,
                scrapedData,
                locale,
              );

            if ((arkheAnalysisResult as any)?.error)
              throw new Error((arkheAnalysisResult as any).error);
            job = await this.updateJob(job, {
              arkheReport: arkheAnalysisResult as any,
            });
            try {
              await this.appendJobEvent(id, {
                step: 'ARKHE',
                status: 'COMPLETED',
              });
            } catch {}
            this.logger.log(`[Orchestrator] Arkhe completed`);
            return arkheAnalysisResult;
          } catch (e: any) {
            this.logger.warn(`[Orchestrator] Arkhe failed: ${e.message}`);
            const errorReport = {
              error: e?.message || 'Arkhe failed',
              failed: true,
            };
            job = await this.updateJob(job, {
              arkheReport: errorReport as any,
            });
            try {
              await this.appendJobEvent(id, {
                step: 'ARKHE',
                status: 'FAILED',
                meta: { message: e?.message },
              });
            } catch {}
            throw e;
          }
        })(),

        // PERFORMANCE
        (async () => {
          job = await this.updateJob(job, { status: 'PROCESSING_PSI' });
          try {
            await this.appendJobEvent(id, { step: 'PSI', status: 'STARTED' });
          } catch {}

          try {
            this.logger.log(`[Orchestrator] Starting Performance analysis`);

            const performanceResult =
              await this.performanceService.runPerformanceAnalysis(url);

            job = await this.updateJob(job, {
              performanceReport: performanceResult,
            } as any);
            try {
              await this.appendJobEvent(id, {
                step: 'PSI',
                status: 'COMPLETED',
              });
            } catch {}

            this.logger.log(`[Orchestrator] Performance completed`);
            return performanceResult;
          } catch (e: any) {
            this.logger.warn(`[Orchestrator] PSI failed: ${e.message}`);
            const errorReport = {
              error: e?.message || 'PSI failed',
              failed: true,
            };
            job = await this.updateJob(job, {
              performanceReport: errorReport as any,
            });
            try {
              await this.appendJobEvent(id, {
                step: 'PSI',
                status: 'FAILED',
                meta: { message: e?.message },
              });
            } catch {}
            throw e;
          }
        })(),
      ]);

      hasArkheData = arkheResult.status === 'fulfilled';
      this.logger.log(
        `[Orchestrator] Phase 2 done - Arkhe: ${arkheResult.status}, Performance: ${performanceResult.status}`,
      );

      // PHASE 3: PARALLEL - Prometheus + Generative Performance
      // (Only if Arkhe succeeded)
      if (hasArkheData) {
        this.logger.log(
          `[Orchestrator] Starting parallel: Prometheus + GenPerf`,
        );

        const [prometheusResult, genPerfResult] = await Promise.allSettled([
          // PROMETHEUS
          (async () => {
            job = await this.updateJob(job, {
              status: 'PROCESSING_PROMETHEUS',
            });
            try {
              await this.appendJobEvent(id, {
                step: 'PROMETHEUS',
                status: 'STARTED',
              });
            } catch {}

            try {
              this.logger.log(`[Orchestrator] Starting Prometheus analysis`);

              const promReport =
                await this.prometheusService.runPrometheusAnalysis(job, locale);

              job = await this.updateJob(job, { prometheusReport: promReport });
              try {
                await this.appendJobEvent(id, {
                  step: 'PROMETHEUS',
                  status: 'COMPLETED',
                });
              } catch {}
              this.logger.log(`[Orchestrator] Prometheus completed`);
              return promReport;
            } catch (e: any) {
              this.logger.warn(
                `[Orchestrator] Prometheus failed: ${e.message}`,
              );
              const errorReport = {
                error: e?.message || 'Prometheus failed',
                failed: true,
              };
              job = await this.updateJob(job, {
                prometheusReport: errorReport as any,
              });
              try {
                await this.appendJobEvent(id, {
                  step: 'PROMETHEUS',
                  status: 'FAILED',
                  meta: { message: e?.message },
                });
              } catch {}
              throw e;
            }
          })(),

          // GENERATIVE PERFORMANCE
          (async () => {
            job = await this.updateJob(job, {
              status: 'PROCESSING_GENERATIVE_PERFORMANCE',
            });
            try {
              await this.appendJobEvent(id, {
                step: 'GEN_PERF',
                status: 'STARTED',
              });
            } catch {}

            try {
              this.logger.log(`[Orchestrator] Starting GenPerf analysis`);
              const targetBrand =
                job.arkheReport?.businessModel?.brandName ||
                new URL(job.url).hostname;
              const genPerfReport =
                await this.genPerfService.runGenerativePerformanceAnalysis(
                  job,
                  targetBrand,
                );

              job = await this.updateJob(job, {
                generativePerformanceReport: genPerfReport,
              });
              try {
                await this.appendJobEvent(id, {
                  step: 'GEN_PERF',
                  status: 'COMPLETED',
                });
              } catch {}
              this.logger.log(`[Orchestrator] GenPerf completed`);
              return genPerfReport;
            } catch (e: any) {
              this.logger.warn(`[Orchestrator] GenPerf failed: ${e.message}`);
              const errorReport = {
                error: e?.message || 'GenPerf failed',
                failed: true,
              };
              job = await this.updateJob(job, {
                generativePerformanceReport: errorReport as any,
              });
              try {
                await this.appendJobEvent(id, {
                  step: 'GEN_PERF',
                  status: 'FAILED',
                  meta: { message: e?.message },
                });
              } catch {}
              throw e;
            }
          })(),
        ]);

        hasPrometheusData = prometheusResult.status === 'fulfilled';
        this.logger.log(
          `[Orchestrator] Phase 3 done - Prometheus: ${prometheusResult.status}, GenPerf: ${genPerfResult.status}`,
        );

        // PHASE 4: LIR (Only if Prometheus succeeded)
        if (hasPrometheusData) {
          job = await this.updateJob(job, { status: 'PROCESSING_LIR' });
          try {
            await this.appendJobEvent(id, { step: 'LIR', status: 'STARTED' });
          } catch {}

          try {
            this.logger.log(`[Orchestrator] Starting Lir analysis`);
            const prometheusReport = (
              prometheusResult as PromiseFulfilledResult<any>
            ).value;

            const delfiAgenda = await this.lirService.runLirAnalysis(
              prometheusReport,
              locale,
            );

            job = await this.updateJob(job, { delfiAgenda });
            try {
              await this.appendJobEvent(id, {
                step: 'LIR',
                status: 'COMPLETED',
              });
            } catch {}
            this.logger.log(`[Orchestrator] Lir completed`);
          } catch (e: any) {
            this.logger.warn(`[Orchestrator] Lir failed: ${e.message}`);
            const errorReport = {
              error: e?.message || 'Lir failed',
              failed: true,
            };
            job = await this.updateJob(job, {
              delfiAgenda: errorReport as any,
            });
            try {
              await this.appendJobEvent(id, {
                step: 'LIR',
                status: 'FAILED',
                meta: { message: e?.message },
              });
            } catch {}
          }

          // Get final GEO score
          const prometheusReport = (
            prometheusResult as PromiseFulfilledResult<any>
          ).value;
          const finalGeoScore = prometheusReport?.overallGeoScore || null;
          job = await this.updateJob(job, { finalGeoScore });
        } else {
          this.logger.warn(`[Orchestrator] Skipping Lir (Prometheus failed)`);
        }
      } else {
        this.logger.warn(
          `[Orchestrator] Skipping Prometheus, GenPerf, Lir (Arkhe failed)`,
        );
      }

      // COMPLETION: Mark as completed even if some steps failed
      job = await this.updateJob(job, { status: 'COMPLETED' });

      // saveReport and updateQueryStatus if needed
      if (job.queryId) {
        await this.databaseService.saveReport(job.queryId, job);
        await this.databaseService.updateQueryStatus(job.queryId, 'COMPLETED');
      }

      this.logger.log(`[Orchestrator] Analysis completed: ${id}`);
      this.logger.log(
        `[Orchestrator] Summary - Scraped: ${hasScrapedData}, Arkhe: ${hasArkheData}, Prometheus: ${hasPrometheusData}`,
      );
    } catch (error) {
      // Only fail if something catastrophic happened (DB error, etc.)
      this.logger.error(`[Orchestrator] Critical error: ${id}`, error);
      try {
        await this.updateJob(job, {
          status: 'FAILED',
          error:
            error instanceof Error ? error.message : 'Unknown error occurred.',
        });
        // updateQueryStatus if needed
        if (job.queryId) {
          await this.databaseService.updateQueryStatus(job.queryId, 'FAILED');
        }
      } catch (writeErr) {
        this.logger.error(
          'Failed to persist FAILED status',
          (writeErr as Error)?.message,
        );
      }

      throw new Error(
        `Analysis orchestration failed: ${id}. ${error instanceof Error ? error.message : ''}`,
      );
    } finally {
      clearInterval(heartbeat);
    }
  }
}
