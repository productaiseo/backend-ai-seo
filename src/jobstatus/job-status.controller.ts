import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  Header,
} from '@nestjs/common';
import { JobStatusService } from './job-status.service';

@Controller('internal/job-status')
export class JobStatusController {
  private readonly logger = new Logger(JobStatusController.name);

  constructor(private readonly jobStatusService: JobStatusService) {}

  @Get(':jobId')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      if (!jobId) {
        throw new HttpException(
          { error: 'Job ID is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.jobStatusService.getJobStatus(jobId);
    } catch (error) {
      this.logger.error('[job-status] Error fetching job status', error);

      // Re-throw if it's already an HttpException (like NotFoundException)
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { error: 'An unexpected error occurred.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
