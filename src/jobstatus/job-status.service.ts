/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AnalysisJob,
  AnalysisJobDocument,
} from '../schemas/AnalysisJob.schema';

@Injectable()
export class JobStatusService {
  private readonly logger = new Logger(JobStatusService.name);

  constructor(
    @InjectModel(AnalysisJob.name)
    private readonly analysisJobModel: Model<AnalysisJobDocument>,
  ) {}

  async getJobStatus(jobId: string) {
    this.logger.log(`[job-status] Fetching job status for ${jobId}`);

    const job = await this.analysisJobModel
      .findOne({ id: jobId })
      .lean()
      .exec();

    // CRITICAL FIX: If job not found, throw NotFoundException
    // This prevents infinite polling on non-existent jobs
    if (!job) {
      this.logger.warn(`[job-status] Job ${jobId} not found in database`);
      throw new NotFoundException({
        error: 'Job not found',
        status: 'NOT_FOUND',
      });
    }

    this.logger.log(`[job-status] Job ${jobId} status: ${job.status}`);

    if (job.status === 'COMPLETED') {
      // When completed, return full job object
      return {
        status: job.status,
        job,
      };
    }

    if (job.status === 'FAILED') {
      return {
        status: job.status,
        error: (job as any).error ?? 'Analysis failed',
      };
    }

    // Return current status for in-progress jobs
    return {
      status: job.status,
      jobId: job.id,
      error: (job as any).error ?? null,
    };
  }
}
