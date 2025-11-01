/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':domain')
  async getReportByDomain(@Param('domain') domain: string) {
    try {
      console.log('[reports-by-domain] Fetching report for', domain);

      const result = await this.reportsService.getReportByDomain(domain);
      return result;
    } catch (error) {
      console.error('[reports-by-domain] error', error);

      if (error.message === 'Domain is required') {
        throw new HttpException('Domain is required', HttpStatus.BAD_REQUEST);
      }

      if (error.message === 'Not found') {
        throw new HttpException('Not found', HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
