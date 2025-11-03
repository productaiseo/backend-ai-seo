/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Header,
} from '@nestjs/common';
import { StartAnalysisService } from './start-analysis.service';
import { StartAnalysisDto } from './dto/start-analysis.dto';

@Controller('internal/start-analysis')
export class StartAnalysisController {
  private readonly logger = new Logger(StartAnalysisController.name);

  constructor(private readonly startAnalysisService: StartAnalysisService) {}

  @Post()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  async startAnalysis(@Body() dto: StartAnalysisDto) {
    try {
      const result = await this.startAnalysisService.startAnalysis(dto);

      // Return with appropriate status code
      if (result.statusCode === 200) {
        throw new HttpException(
          { jobId: result.jobId, status: result.status },
          HttpStatus.OK,
        );
      }

      if (result.statusCode === 202) {
        throw new HttpException(
          { jobId: result.jobId, status: result.status },
          HttpStatus.ACCEPTED,
        );
      }

      return { jobId: result.jobId, status: result.status };
    } catch (error) {
      this.logger.error('[start-analysis] Error in POST handler:', error);

      // Re-throw if it's already an HttpException
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { error: 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
