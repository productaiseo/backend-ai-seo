/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScrapeUrlDto } from './dto/scrape-url.dto';
import logger from '../utils/logger';

@Controller('scraper')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(private readonly scraperService: ScraperService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post()
  async scrapePage(@Body() body: ScrapeUrlDto) {
    try {
      // const { url } = body;

      if (!body.url || typeof body.url !== 'string') {
        throw new HttpException(
          'Invalid URL parameter',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`[Test] Starting Puppeteer scrape for ${body.url}`);
      logger.info(`[Test] Starting Puppeteer scrape for ${body.url}`, '');

      const scrapedData = await this.scraperService.puppeteerScraper(body.url);
      const { content: scrapedContent, html: scrapedHtml } = scrapedData;

      this.logger.log(
        `[Test] Scrape completed. Content length: ${scrapedContent.length}`,
      );
      logger.info(
        `[Test] Scrape completed. Content length: ${scrapedContent.length}`,
        '',
      );

      return {
        content: scrapedContent,
        html: scrapedHtml,
      };
    } catch (error: any) {
      this.logger.error('[Test] Error in POST handler:', error);
      console.error('[Test] Error in POST handler:', error);
      logger.error?.('TestAPI failed', 'test-puppeteer', { error });

      throw new HttpException(
        error.message || 'Internal Server Error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
