import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';

import { AnalysisJob, AnalysisJobSchema } from '../schemas/AnalysisJob.schema';
import { JobEvent, JobEventSchema } from '../schemas/JobEvent.schema';
import { Report, ReportSchema } from '../schemas/Report.schema';
import { Query, QuerySchema } from '../schemas/Query.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisJob.name, schema: AnalysisJobSchema },
      { name: JobEvent.name, schema: JobEventSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Query.name, schema: QuerySchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
