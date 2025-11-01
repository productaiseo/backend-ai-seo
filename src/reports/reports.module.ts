import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

import {
  AnalysisJobSchema,
  AnalysisJob,
} from '.././schemas/AnalysisJob.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AnalysisJob.name,
        schema: AnalysisJobSchema,
      },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
