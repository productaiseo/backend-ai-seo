/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Injectable, Logger } from '@nestjs/common';
import type { Browser } from 'playwright-core';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const OVERALL_TIMEOUT_MS = 45000; // 45 seconds max per attempt

interface PlaywrightScrapeResult {
  html: string;
  content: string;
  robotsTxt?: string;
  llmsTxt?: string;
  performanceMetrics?: any;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;
  private chromiumPathPromise: Promise<string> | null = null;

  private async getBrowser(): Promise<Browser> {
    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.VERCEL;

    // Reuse healthy browser
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // If another invocation is already launching, await it
    if (this.browserPromise) {
      return this.browserPromise;
    }

    // Launch once (guard with promise)
    this.browserPromise = (async () => {
      let browser: Browser;

      if (isProduction) {
        const [{ chromium: chromiumLauncher }, chromiumModule] =
          await Promise.all([
            import('playwright-core').then((m) => ({ chromium: m.chromium })),
            import('@sparticuz/chromium'),
          ]);

        const chromiumPkg = chromiumModule.default || chromiumModule;

        // Ensure only ONE extraction to /tmp runs at a time across invocations
        const executablePath =
          this.chromiumPathPromise || chromiumPkg.executablePath();
        this.chromiumPathPromise = executablePath as Promise<string>;
        const path = await executablePath;

        browser = await chromiumLauncher.launch({
          headless: true,
          executablePath: path,
          args: chromiumPkg.args,
          chromiumSandbox: false,
        });
      } else {
        const { chromium } = await import('playwright');
        browser = await chromium.launch({ headless: true });
      }

      browser.on('disconnected', () => {
        this.browser = null;
      });
      this.browser = browser;
      return browser;
    })();

    try {
      return await this.browserPromise;
    } finally {
      // Clear the promise so a future relaunch can happen if this one dies later
      this.browserPromise = null;
    }
  }

  /**
   * Scrape with overall timeout protection
   */
  private async scrapeWithTimeout(
    url: string,
    timeoutMs: number,
  ): Promise<PlaywrightScrapeResult> {
    return new Promise(async (resolve, reject) => {
      let browser: Browser | null = null;
      let context: import('playwright-core').BrowserContext | null = null;
      let page: import('playwright-core').Page | null = null;
      let timeoutHandle: NodeJS.Timeout | null = null;
      let isTimedOut = false;

      // Overall timeout
      timeoutHandle = setTimeout(() => {
        isTimedOut = true;
        const error = new Error(`Scraping timed out after ${timeoutMs}ms`);
        this.logger.error(`[playwright-scraper] Timeout reached for ${url}`);

        // Force cleanup
        Promise.all([
          page?.close().catch(() => {}),
          context?.close().catch(() => {}),
        ]).finally(() => {
          reject(error);
        });
      }, timeoutMs);

      try {
        browser = await this.getBrowser();

        context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
          ignoreHTTPSErrors: true,
        });

        page = await context.newPage();

        // Shorter individual timeouts since we have overall timeout
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000, // Reduced from 60s
        });

        if (isTimedOut) return; // Already cleaned up

        // Shorter network idle
        await page
          .waitForLoadState('networkidle', { timeout: 10_000 })
          .catch(() => {
            this.logger.warn(
              `[playwright-scraper] Network idle timeout (non-fatal)`,
            );
          });

        if (isTimedOut) return;

        if (!response || !response.ok()) {
          throw new Error(
            `HTTP error! Status: ${response?.status()} for ${url}. Could not reach the website (Error Code: ${response?.status()}). Please check the URL.`,
          );
        }

        const html = await page.content();
        const content = await page.evaluate(
          () => document.body?.innerText || '',
        );

        if (!content || content.trim().length < 100) {
          throw new Error(
            'Insufficient content scraped. The page may not have loaded properly.',
          );
        }

        // robots.txt + llms.txt (with shorter timeout)
        const [robotsTxt, llmsTxt] = await Promise.allSettled([
          page.evaluate(async (baseUrl: string) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(
                new URL('/robots.txt', baseUrl).toString(),
                {
                  signal: controller.signal,
                },
              );
              clearTimeout(timeoutId);
              return res.ok ? await res.text() : undefined;
            } catch {
              return undefined;
            }
          }, url),
          page.evaluate(async (baseUrl: string) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(
                new URL('/llms.txt', baseUrl).toString(),
                {
                  signal: controller.signal,
                },
              );
              clearTimeout(timeoutId);
              return res.ok ? await res.text() : undefined;
            } catch {
              return undefined;
            }
          }, url),
        ]).then((results) => [
          results[0].status === 'fulfilled' ? results[0].value : undefined,
          results[1].status === 'fulfilled' ? results[1].value : undefined,
        ]);

        if (isTimedOut) return;

        // Performance metrics
        let performanceMetrics;
        try {
          performanceMetrics = await page.evaluate(() =>
            JSON.parse(JSON.stringify(window.performance)),
          );
        } catch (e) {
          this.logger.warn(
            `[playwright-scraper] Could not get performance metrics`,
          );
          performanceMetrics = {};
        }

        this.logger.log(`[playwright-scraper] Success - ${url}`);

        // Clear timeout and resolve
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        resolve({ html, content, robotsTxt, llmsTxt, performanceMetrics });
      } catch (error: any) {
        if (isTimedOut) return; // Already handled by timeout

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        reject(error);
      } finally {
        // Cleanup
        try {
          await page?.close().catch(() => {});
          await context?.close().catch(() => {});
        } catch (closeErr) {
          this.logger.error(
            `[playwright-scraper] Error closing page/context`,
            closeErr,
          );
        }
      }
    });
  }

  async playwrightScraper(url: string): Promise<PlaywrightScrapeResult> {
    const normalizedUrl =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;

    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.log(
          `[playwright-scraper] Attempt ${attempt}/${MAX_RETRIES} - ${normalizedUrl}`,
        );

        const result = await this.scrapeWithTimeout(
          normalizedUrl,
          OVERALL_TIMEOUT_MS,
        );
        return result;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `[playwright-scraper] Attempt ${attempt}/${MAX_RETRIES} failed - ${normalizedUrl}`,
          error?.message,
        );

        if (error?.message?.includes('net::ERR_NAME_NOT_RESOLVED')) {
          throw new Error(
            `Domain could not be resolved: ${normalizedUrl}. The specified domain name could not be found. Please check the URL and try again.`,
          );
        }

        // Don't retry on timeout - it's likely a bad site
        if (error?.message?.includes('timed out')) {
          this.logger.error(
            `[playwright-scraper] Timeout after ${OVERALL_TIMEOUT_MS}ms, not retrying`,
          );
          break;
        }

        if (attempt < MAX_RETRIES) {
          this.logger.log(
            `[playwright-scraper] Waiting ${RETRY_DELAY_MS}ms before retry`,
          );
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    throw new Error(
      `Failed to scrape page after ${MAX_RETRIES} attempts: ${normalizedUrl}. An issue occurred while scraping the website. Please check the URL and try again. Error: ${lastError?.message}`,
    );
  }

  // Cleanup method to close browser when service is destroyed
  async onModuleDestroy() {
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close().catch((err) => {
        this.logger.error('Error closing browser on module destroy', err);
      });
    }
  }
}
