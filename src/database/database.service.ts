/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AnalysisJob,
  AnalysisJobDocument,
} from '../schemas/AnalysisJob.schema';
import { JobEvent, JobEventDocument } from '../schemas/JobEvent.schema';
import { Report, ReportDocument } from '../schemas/Report.schema';
import { Query, QueryDocument } from '../schemas/Query.schema';

function isoNow() {
  return new Date().toISOString();
}

// mirror cleanUndefined behavior from Next util
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
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectModel(AnalysisJob.name)
    private readonly analysisJobModel: Model<AnalysisJobDocument>,
    @InjectModel(JobEvent.name)
    private readonly jobEventModel: Model<JobEventDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Query.name) private readonly queryModel: Model<QueryDocument>,
  ) {}

  /** Read a job by public `id` (not _id). */
  async getJob(id: string): Promise<AnalysisJob | null> {
    const doc = await this.analysisJobModel
      .findOne({ id })
      .lean<AnalysisJob>()
      .exec();
    return doc ?? null;
  }

  /** Partially update a job; auto-sets updatedAt; upserts if missing. */
  async updateJob(id: string, updates: Partial<AnalysisJob>): Promise<void> {
    const payload = cleanUndefined({ ...updates, updatedAt: isoNow() });
    await this.analysisJobModel
      .updateOne({ id }, { $set: payload }, { upsert: true })
      .exec();
  }

  /** Persist a full report document keyed by jobId (upsert). */
  async saveReport(
    queryId: string | undefined,
    job: AnalysisJob,
  ): Promise<void> {
    if (!job?.id) return;

    const reportDoc: Partial<Report> = {
      jobId: job.id,
      userId: (job as any).userId,
      domain: job.url,
      createdAt: (job as any).createdAt,
      updatedAt: isoNow(),
      finalGeoScore: (job as any).finalGeoScore ?? null,
      arkheReport: (job as any).arkheReport ?? null,
      prometheusReport: (job as any).prometheusReport ?? null,
      delfiAgenda: (job as any).delfiAgenda ?? null,
      generativePerformanceReport:
        (job as any).generativePerformanceReport ?? null,
      performanceReport: (job as any).performanceReport ?? null,
      queryId: queryId ?? null,
      enhancedAnalysis: (job as any).enhancedAnalysis ?? null,
    };

    await this.reportModel
      .updateOne({ jobId: job.id }, { $set: reportDoc }, { upsert: true })
      .exec();
  }

  /** Maintain a queries/{queryId} status (upsert). */
  async updateQueryStatus(
    queryId: string | undefined,
    status: string,
  ): Promise<void> {
    if (!queryId) return;
    await this.queryModel
      .updateOne(
        { id: queryId },
        { $set: { id: queryId, status, updatedAt: isoNow() } },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Append a job event and also store it inside the job’s `events` array.
   * Mirrors Next’s database.ts behavior.
   */
  async appendJobEvent(
    jobId: string,
    event: {
      step: string;
      status: 'STARTED' | 'COMPLETED' | 'FAILED';
      timestamp?: string;
      detail?: any;
    },
  ): Promise<void> {
    const ts = isoNow();

    // A) push into analysisJobs.events[]
    await this.analysisJobModel
      .updateOne(
        { id: jobId },
        {
          $push: {
            events: {
              step: event.step,
              status: event.status,
              timestamp: ts,
              detail: event.detail ?? null,
            },
          },
          $setOnInsert: { id: jobId, createdAt: ts },
          $set: { updatedAt: ts },
        },
        { upsert: true },
      )
      .exec();

    // B) standalone JobEvent row
    try {
      await this.jobEventModel.create({
        jobId,
        step: event.step,
        status: event.status,
        meta: event.detail ?? null,
        ts,
      });
    } catch (e) {
      this.logger.warn(
        `appendJobEvent secondary write failed (non-fatal): ${(e as Error)?.message}`,
      );
    }
  }
}
