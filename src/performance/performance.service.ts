/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';

// If you use PageSpeed Insights, set PSI_API_KEY in env.
// Otherwise you can plug any provider and still return the same shape below.
const PSI_ENDPOINT =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

interface PerformanceReport {
  url: string;
  fetchedAt: string;
  lab: {
    lcpMs: number | null;
    fcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    speedIndexMs: number | null;
  };
  field: {
    lcpP75: number | null;
    fcpP75: number | null;
    clsP75: number | null;
    fidP75: number | null;
    inpP75: number | null;
  };
  rawProvider: string;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  /** Helper: deep get */
  private get<T = any>(obj: any, path: string, fallback?: T): T | undefined {
    return (
      path
        .split('.')
        .reduce((o: any, k: string) => (o && k in o ? o[k] : undefined), obj) ??
      fallback
    );
  }

  /** Helper: extract p75 safely from CrUX "metrics" */
  private p75(metrics: any, key: string): number | null {
    // CrUX API: metrics.<key>.percentiles.p75
    const v = metrics?.[key]?.percentiles?.p75;
    return typeof v === 'number' ? v : null;
  }

  /** Normalizes PSI/CrUX response into your app's report format */
  private buildReport(url: string, json: any): PerformanceReport {
    // Two common sources inside PSI v5 response:
    // 1) Lighthouse audits (json.lighthouseResult.audits.*)
    // 2) CrUX field data (json.loadingExperience / json.originLoadingExperience OR CrUX API "record.metrics")

    // ---- Lighthouse (lab) sampling (optional) ----
    const audits = this.get(json, 'lighthouseResult.audits', {});
    const lcpMsLab =
      Number(this.get(audits, 'largest-contentful-paint.numericValue', null)) ||
      null;
    const clsLab =
      Number(this.get(audits, 'cumulative-layout-shift.numericValue', null)) ||
      null;
    const fcpMsLab =
      Number(this.get(audits, 'first-contentful-paint.numericValue', null)) ||
      null;
    const tbtMsLab =
      Number(this.get(audits, 'total-blocking-time.numericValue', null)) ||
      null;
    const siMsLab =
      Number(this.get(audits, 'speed-index.numericValue', null)) || null;

    // ---- Field (CrUX) p75: handle both PSI and CrUX endpoints ----
    // PSI embedding:
    const psiField =
      this.get(json, 'loadingExperience.metrics') ||
      this.get(json, 'originLoadingExperience.metrics') ||
      null;

    // CrUX direct (if you ever swap to the CrUX API):
    const cruxRecordMetrics = this.get(json, 'record.metrics') || null;

    const fieldMetrics = psiField || cruxRecordMetrics || {};

    // Try both PSI metric keys and CrUX keys:
    // PSI keys example: FIRST_CONTENTFUL_PAINT_MS, LARGEST_CONTENTFUL_PAINT_MS, CUMULATIVE_LAYOUT_SHIFT_SCORE, FIRST_INPUT_DELAY_MS, INTERACTION_TO_NEXT_PAINT
    // CrUX keys example: first_contentful_paint, largest_contentful_paint, cumulative_layout_shift, first_input_delay, interaction_to_next_paint
    const fcpField =
      this.p75(fieldMetrics, 'FIRST_CONTENTFUL_PAINT_MS') ??
      this.p75(fieldMetrics, 'first_contentful_paint') ??
      null;

    const lcpField =
      this.p75(fieldMetrics, 'LARGEST_CONTENTFUL_PAINT_MS') ??
      this.p75(fieldMetrics, 'largest_contentful_paint') ??
      null;

    const clsField =
      this.p75(fieldMetrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE') ??
      this.p75(fieldMetrics, 'cumulative_layout_shift') ??
      null;

    const fidField =
      this.p75(fieldMetrics, 'FIRST_INPUT_DELAY_MS') ??
      this.p75(fieldMetrics, 'first_input_delay') ??
      null;

    const inpField =
      this.p75(fieldMetrics, 'INTERACTION_TO_NEXT_PAINT') ??
      this.p75(fieldMetrics, 'interaction_to_next_paint') ??
      null;

    return {
      url,
      fetchedAt: new Date().toISOString(),
      lab: {
        lcpMs: lcpMsLab,
        fcpMs: fcpMsLab,
        cls: clsLab,
        tbtMs: tbtMsLab,
        speedIndexMs: siMsLab,
      },
      field: {
        // p75 values in ms or unitless (CLS)
        lcpP75: lcpField,
        fcpP75: fcpField,
        clsP75: clsField, // unitless
        fidP75: fidField,
        inpP75: inpField,
      },
      rawProvider: (json && json.kind) || 'unknown', // optional
    };
  }

  /**
   * Run performance analysis using PSI if PSI_API_KEY is present.
   * If missing, returns a no-op report (so the pipeline doesn't crash).
   */
  async runPerformanceAnalysis(url: string): Promise<PerformanceReport> {
    try {
      const apiKey =
        process.env.GOOGLE_PAGESPEED_API_KEY || process.env.PSI_API_KEY;

      if (!apiKey) {
        // No external provider configured → return empty but valid structure
        this.logger.warn(
          'PSI_API_KEY missing; returning stub performance report',
        );
        return this.buildReport(url, {}); // will have mostly nulls
      }

      const u = new URL(PSI_ENDPOINT);
      u.searchParams.set('url', url);
      u.searchParams.set('strategy', 'mobile');
      u.searchParams.set('category', 'performance');
      u.searchParams.set('key', apiKey);

      this.logger.log(`PageSpeed Insights analysis is starting: ${url}`);

      const resp = await fetch(u.toString(), { method: 'GET' });
      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // Surface API errors, but keep the pipeline alive by throwing an error
        const msg =
          (json && (json.error?.message || json.message)) ||
          `PSI request failed with ${resp.status}`;
        throw new Error(`External API error: ${msg}. Status: ${resp.status}`);
      }

      // Build safe report regardless of which fields are present
      const report = this.buildReport(url, json);
      this.logger.log(`PageSpeed Insights analysis completed: ${url}`);
      return report;
    } catch (err: any) {
      // Wrap unknown shape errors so they're visible but typed
      const msg = err?.message || 'Unknown error in runPerformanceAnalysis';
      this.logger.error(msg, err);
      throw new Error(msg);
    }
  }
}
