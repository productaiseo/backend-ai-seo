/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScrapeUrlDto } from '../dto/scrape-url.dto';
import logger from '../../utils/logger';

@Controller('test/puppeteer')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  async scrapePage(@Body() scrapeUrlDto: ScrapeUrlDto) {
    try {
      const { url } = scrapeUrlDto;

      if (!url || typeof url !== 'string') {
        throw new HttpException(
          'Invalid URL parameter',
          HttpStatus.BAD_REQUEST,
        );
      }

      logger.info(`[Test] Starting Puppeteer scrape for ${url}`, '');

      const scrapedData = await this.scraperService.puppeteerScraper(url);
      const { content: scrapedContent, html: scrapedHtml } = scrapedData;

      logger.info(
        `[Test] Scrape completed. Content length: ${scrapedContent.length}`,
        '',
      );

      return {
        content: scrapedContent,
        html: scrapedHtml,
      };
    } catch (error: any) {
      console.error('[Test] Error in POST handler:', error);
      logger.error?.('TestAPI failed', 'test-puppeteer', { error });

      throw new HttpException(
        error.message || 'Internal Server Error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
