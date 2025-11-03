/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  AnalysisJob,
  AnalysisJobDocument,
} from '../schemas/AnalysisJob.schema';
import { StartAnalysisDto } from './dto/start-analysis.dto';
import { OrchestrationService } from '../orchestration/orchestration.service';

@Injectable()
export class StartAnalysisService {
  private readonly logger = new Logger(StartAnalysisService.name);

  constructor(
    @InjectModel(AnalysisJob.name)
    private readonly analysisJobModel: Model<AnalysisJobDocument>,
    private readonly orchestrationService: OrchestrationService, // Inject orchestration service
  ) {}

  /**
   * Extract clean hostname from any URL format
   * Returns just the domain without protocol or www
   */
  private extractHostname(input: string): string {
    try {
      // Add protocol if missing
      const urlish = input.includes('://') ? input : `https://${input}`;
      const url = new URL(urlish);
      // Remove www. prefix
      return url.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      // Fallback for malformed URLs
      return input
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .toLowerCase();
    }
  }

  /**
   * Normalize URL by adding https:// if no protocol exists
   */
  private normalizeUrl(raw: string): string {
    if (!raw) return raw;
    return raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `https://${raw}`;
  }

  /**
   * Clean undefined values from objects recursively
   */
  private cleanUndefined<T>(v: T): T {
    if (Array.isArray(v))
      return v
        .map((item) => this.cleanUndefined(item))
        .filter((x) => x !== undefined) as any;
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const [k, val] of Object.entries(v as any)) {
        const sv = this.cleanUndefined(val as any);
        if (sv !== undefined) out[k] = sv;
      }
      return out;
    }
    return v;
  }

  async startAnalysis(dto: StartAnalysisDto) {
    // Support both direct calls
    const url = dto.url || dto.domain;
    const locale = dto.locale || 'en';
    const existingJobId = dto.jobId; // if called from analyze-domain
    const userId = dto.userId || 'public';

    // Input validation
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('URL is required and must be a string');
    }

    const normalizedUrl = this.normalizeUrl(url);
    const hostname = this.extractHostname(url);

    this.logger.log(`[start-analysis] Input URL: ${url}`);
    this.logger.log(`[start-analysis] Normalized URL: ${normalizedUrl}`);
    this.logger.log(`[start-analysis] Hostname: ${hostname}`);
    this.logger.log(`[start-analysis] Locale: ${locale}`);
    this.logger.log(
      `[start-analysis] Existing jobId: ${existingJobId || 'none'}`,
    );

    let jobId: string;
    let job: any;

    // If jobId provided, update existing job
    if (existingJobId) {
      this.logger.log(
        `[start-analysis] Using existing jobId: ${existingJobId}`,
      );

      const existingJob = await this.analysisJobModel
        .findOne({ id: existingJobId })
        .lean()
        .exec();

      if (!existingJob) {
        this.logger.error(`[start-analysis] Job not found: ${existingJobId}`);
        throw new NotFoundException('Job not found');
      }

      // Update to PROCESSING_SCRAPE
      await this.analysisJobModel
        .updateOne(
          { id: existingJobId },
          {
            $set: {
              status: 'PROCESSING_SCRAPE',
              updatedAt: new Date().toISOString(),
            },
          },
        )
        .exec();

      jobId = existingJobId;
      job = {
        ...existingJob,
        status: 'PROCESSING_SCRAPE',
        updatedAt: new Date().toISOString(),
      };

      this.logger.log(`[start-analysis] Updated existing job: ${jobId}`);
    }
    // Otherwise, create new job
    else {
      // Check for existing job in last 24 hours to avoid duplicates
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentJob = await this.analysisJobModel
        .findOne({
          urlHost: hostname,
          createdAt: { $gte: sinceIso },
        })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      if (recentJob && recentJob.status !== 'FAILED') {
        this.logger.log(
          `[start-analysis] Found recent job: ${recentJob.id} status: ${recentJob.status}`,
        );

        if (recentJob.status === 'COMPLETED') {
          return {
            jobId: recentJob.id,
            status: 'COMPLETED',
            statusCode: 200,
          };
        }

        // Job is in progress, return existing jobId
        return {
          jobId: recentJob.id,
          status: recentJob.status,
          statusCode: 202,
        };
      }

      const nowIso = new Date().toISOString();
      jobId = (uuidv4 as unknown as () => string)();

      job = {
        id: jobId,
        userId,
        url: normalizedUrl,
        urlHost: hostname,
        locale,
        status: 'PROCESSING_SCRAPE',
        createdAt: nowIso,
        updatedAt: nowIso,
        finalGeoScore: null,
      };

      const payload = this.cleanUndefined(job) as any;
      await this.analysisJobModel.create(payload);

      this.logger.log(
        `[start-analysis] Created new job: ${jobId} for domain: ${hostname}`,
      );

      // Verify write
      try {
        const check = await this.analysisJobModel
          .findOne({ id: jobId })
          .lean()
          .exec();
        if (!check) {
          this.logger.error('[start-analysis] Job write verification failed');
        }
      } catch (err) {
        this.logger.error('[start-analysis] Job verification error:', err);
      }
    }

    // Fire-and-forget: Start orchestration in background using the service
    this.orchestrationService.orchestrateAnalysis(job).catch((error: any) => {
      this.logger.error(
        `[start-analysis] orchestrateAnalysis failed (detached) for jobId: ${jobId}`,
        error?.message || error,
      );

      this.analysisJobModel
        .updateOne(
          { id: jobId },
          {
            $set: {
              status: 'FAILED',
              updatedAt: new Date().toISOString(),
              error: error?.message || 'Analysis orchestration failed',
            },
          },
        )
        .exec()
        .catch((dbErr) => {
          this.logger.error(
            '[start-analysis] Failed to update job status to FAILED:',
            dbErr,
          );
        });
    });

    // Return immediately with jobId
    return {
      jobId,
      status: 'PROCESSING_SCRAPE',
      statusCode: 202,
    };
  }
}
