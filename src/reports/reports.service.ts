/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AnalysisJob,
  AnalysisJobDocument,
} from '../schemas/AnalysisJob.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(AnalysisJob.name)
    private analysisJobModel: Model<AnalysisJobDocument>,
  ) {}

  private normalizeDomain(input: string): string {
    try {
      const urlish = input.includes('://') ? input : `https://${input}`;
      const u = new URL(urlish);
      return u.hostname.toLowerCase();
    } catch {
      return input
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .toLowerCase();
    }
  }

  async getReportByDomain(domain: string) {
    const raw = decodeURIComponent(domain || '');
    if (!raw) {
      throw new Error('Domain is required');
    }

    const host = this.normalizeDomain(raw);

    // 24h window (use ISO strings; your schema stores createdAt as ISO string)
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Candidates that will match stored full URLs
    const candidates = [
      host,
      `https://${host}`,
      `http://${host}`,
      `https://www.${host}`,
      `http://www.${host}`,
    ];

    // Regex to catch any protocol/path variations, incl. www
    const safeRegex = new RegExp(
      `^https?://(www\\.)?${host.replace(/\./g, '\\.')}(/|$)`,
      'i',
    );

    // Only consider jobs created in the last 24 hours
    const job = await this.analysisJobModel
      .findOne({
        createdAt: { $gte: sinceIso },
        $or: [
          { normalizedDomain: host }, // if/when present
          { urlHost: host }, // if/when present
          { url: { $in: candidates } },
          { url: { $regex: safeRegex } },
        ],
      })
      .sort([['createdAt', -1]]) // newest within the 24h window
      .lean()
      .exec();

    if (!job) {
      // No job in last 24h => allow a new analysis
      throw new NotFoundException('Not found');
    }

    // If there is a job in the 24h window:
    if (job.status !== 'COMPLETED') {
      // still running or failed within 24h -> surface status
      return {
        status: job.status,
        jobId: (job as any).id || (job as any)._id,
      };
    }

    // Completed in the last 24h -> reuse it
    return {
      status: job.status,
      job,
    };
  }
}
