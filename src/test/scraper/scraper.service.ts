/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import { AppError, ErrorType } from '../../utils/errors';
import logger from '../../utils/logger';
import { ScrapeResult } from '../../types/analysis';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let puppeteer: any;
let chromium: any;

@Injectable()
export class ScraperService {
  private async getBrowser() {
    const isProduction = process.env.NODE_ENV === 'production';

    logger.info(
      `[puppeteer-scraper] Environment check`,
      'puppeteer environment',
      {
        isProduction,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        platform: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString(),
      },
    );

    // Production environment (Vercel)
    if (isProduction) {
      try {
        logger.info(
          `[puppeteer-scraper] Setting up production browser...`,
          'puppeteer-scraper',
        );

        const [chromiumModule, puppeteerModule] = await Promise.all([
          import('@sparticuz/chromium'),
          import('puppeteer-core'),
        ]);

        // Access the default exports correctly
        chromium = chromiumModule.default || chromiumModule;
        puppeteer = puppeteerModule.default || puppeteerModule;

        logger.info(
          `[puppeteer-scraper] Packages imported successfully`,
          'puppeteer-scraper',
        );

        // Get executable path from chromium
        let executPath: string | undefined;
        try {
          executPath = await chromium.executablePath();
        } catch (e) {
          logger.warn(
            '[puppeteer-scraper] executablePath failed; using remote pack fallback once',
          );
          const chromiumMin = (await import('@sparticuz/chromium-min')).default;
          executPath = await chromiumMin.executablePath(
            'https://github.com/Sparticuz/chromium/releases/download/v140.0.0/chromium-v140.0.0-pack.x64.tar',
          );
        }
        logger.info(
          `[puppeteer-scraper] Executable path: ${executPath}`,
          'puppeteer-scraper',
        );

        // Launch browser with proper configuration
        logger.info(
          `[puppeteer-scraper] Launching browser...`,
          'puppeteer-scraper',
        );
        const browser = await puppeteer.launch({
          headless: true,
          executablePath: executPath,
          defaultViewport: chromium.defaultViewport,
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
          ],
        });

        logger.info(
          `[puppeteer-scraper] Browser launched successfully`,
          'puppeteer-scraper',
        );
        return browser;
      } catch (prodError: any) {
        logger.error(
          `[puppeteer-scraper] Production setup failed: ${prodError.message}`,
          'puppeteer-scraper',
        );
        logger.error(
          `[puppeteer-scraper] Error details:`,
          'puppeteer-scraper',
          {
            message: prodError.message,
            stack: prodError.stack,
            name: prodError.name,
          },
        );
        throw new Error(
          `Production browser setup failed: ${prodError.message}`,
        );
      }
    } else {
      // Development environment
      try {
        logger.info(
          `[puppeteer-scraper] Setting up development browser...`,
          'puppeteer-scraper',
        );

        const puppeteerModule = await import('puppeteer');
        puppeteer = puppeteerModule.default || puppeteerModule;

        const browser = await puppeteer.launch({
          headless: 'new',
          ignoreHTTPSErrors: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        });

        logger.info(
          `[puppeteer-scraper] Browser launched successfully`,
          'puppeteer-scraper',
        );
        return browser;
      } catch (devError: any) {
        logger.error(
          `[puppeteer-scraper] Development setup failed: ${devError.message}`,
          'puppeteer-scraper',
        );
        throw new Error(
          `Development browser setup failed: ${devError.message}`,
        );
      }
    }
  }

  async puppeteerScraper(url: string): Promise<ScrapeResult> {
    const normalizedUrl =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;

    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let browser: any | null = null;

      try {
        logger.info(
          `[puppeteer-scraper] Attempt ${attempt}/${MAX_RETRIES} - ${normalizedUrl}`,
        );

        browser = await this.getBrowser();
        logger.info(
          `[puppeteer-scraper] Browser launched successfully`,
          'puppeteer-scraper',
        );

        const page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        // Set extra HTTP headers for locale
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
        });

        const response = await page.goto(normalizedUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        await page
          .waitForNetworkIdle({ idleTime: 1000, timeout: 15000 })
          .catch(() => {});

        if (!response || !response.ok()) {
          throw new AppError(
            ErrorType.SCRAPING_ERROR,
            `HTTP error! Status: ${response?.status()} for ${normalizedUrl}`,
            {
              userFriendlyMessage: `Could not reach the website (Error Code: ${response?.status()}). Please check the URL.`,
            },
          );
        }

        const html = await page.content();
        const content = await page.evaluate(
          () => document.body.innerText || '',
        );

        if (!content || content.trim().length < 100) {
          throw new Error(
            'Insufficient content scraped. The page may not have loaded properly.',
          );
        }

        // Fetch robots.txt and llms.txt
        const [robotsTxt, llmsTxt] = await Promise.all([
          (async () => {
            try {
              const result = await page.evaluate(async (baseUrl: string) => {
                try {
                  const response = await fetch(
                    new URL('/robots.txt', baseUrl).toString(),
                  );
                  return response.ok ? await response.text() : undefined;
                } catch {
                  return undefined;
                }
              }, normalizedUrl);
              return result;
            } catch {
              logger.warn(`[puppeteer-scraper] robots.txt not reachable`);
              return undefined;
            }
          })(),
          (async () => {
            try {
              const result = await page.evaluate(async (baseUrl: string) => {
                try {
                  const response = await fetch(
                    new URL('/llms.txt', baseUrl).toString(),
                  );
                  return response.ok ? await response.text() : undefined;
                } catch {
                  return undefined;
                }
              }, normalizedUrl);
              return result;
            } catch {
              logger.warn(`[puppeteer-scraper] llms.txt not reachable`);
              return undefined;
            }
          })(),
        ]);

        const performanceMetrics = await page.evaluate(() =>
          JSON.parse(JSON.stringify(window.performance)),
        );

        logger.info(`[puppeteer-scraper] Success - ${normalizedUrl}`);

        return { html, content, robotsTxt, llmsTxt, performanceMetrics };
      } catch (error: any) {
        lastError = error;
        logger.warn(
          `[puppeteer-scraper] Attempt ${attempt}/${MAX_RETRIES} failed - ${normalizedUrl}`,
          'puppeteer-scraper',
          { error: error?.message },
        );

        if (error?.message?.includes('net::ERR_NAME_NOT_RESOLVED')) {
          throw new AppError(
            ErrorType.DNS_RESOLUTION_ERROR,
            `Alan adı çözümlenemedi: ${normalizedUrl}`,
            {
              contextData: { url: normalizedUrl, error: error.message },
              userFriendlyMessage:
                'The specified domain name could not be found. Please check the URL and try again.',
            },
          );
        }

        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      } finally {
        try {
          if (browser) {
            await browser.close();
            logger.info(
              `[puppeteer-scraper] Browser closed successfully`,
              'puppeteer-scraper',
            );
          }
        } catch (closeError) {
          logger.error(
            `[puppeteer-scraper] Error closing browser`,
            'puppeteer-scraper',
            { error: closeError },
          );
        }
      }
    }

    throw new AppError(
      ErrorType.SCRAPING_ERROR,
      `Puppeteer ile sayfa taranırken ${MAX_RETRIES} denemenin ardından bir hata oluştu: ${normalizedUrl}`,
      {
        contextData: { url: normalizedUrl, error: lastError?.message },
        userFriendlyMessage:
          'An issue occurred while scraping the website. Please check the URL and try again.',
      },
    );
  }
}
