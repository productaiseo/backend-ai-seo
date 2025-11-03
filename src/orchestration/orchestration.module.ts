import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrchestrationService } from './orchestration.service';
import { AnalysisJob, AnalysisJobSchema } from '../schemas/AnalysisJob.schema';
import { JobEvent, JobEventSchema } from '../schemas/JobEvent.schema';
import { ScraperModule } from '../scraper/scraper.module';
import { PerformanceModule } from '../performance/performance.module';
import { ArkheModule } from '../arkhe/arkhe.module';
import { PrometheusModule } from '../prometheus/prometheus.module';
import { ScoringModule } from '../scoring/scroring.module';
import { GenerativePerformanceModule } from '../generative-performance/generative-performance.module';
import { LirModule } from '../lir/lir.module';
import { DatabaseModule } from '../database/database.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisJob.name, schema: AnalysisJobSchema },
      { name: JobEvent.name, schema: JobEventSchema },
    ]),
    ScraperModule,
    PerformanceModule,
    ArkheModule,
    PrometheusModule,
    ScoringModule,
    GenerativePerformanceModule,
    LirModule,
    DatabaseModule,
  ],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
