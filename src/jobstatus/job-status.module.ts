import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobStatusController } from './job-status.controller';
import { JobStatusService } from './job-status.service';
import { AnalysisJob, AnalysisJobSchema } from '../schemas/AnalysisJob.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisJob.name, schema: AnalysisJobSchema },
    ]),
  ],
  controllers: [JobStatusController],
  providers: [JobStatusService],
})
export class JobStatusModule {}
