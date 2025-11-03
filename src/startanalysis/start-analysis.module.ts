import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StartAnalysisController } from '../startanalysis/start-analysis.controller';
import { StartAnalysisService } from '../startanalysis/start-analysis.service';
import { AnalysisJob, AnalysisJobSchema } from '../schemas/AnalysisJob.schema';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisJob.name, schema: AnalysisJobSchema },
    ]),
    OrchestrationModule,
  ],
  controllers: [StartAnalysisController],
  providers: [StartAnalysisService],
  exports: [StartAnalysisService],
})
export class StartAnalysisModule {}
