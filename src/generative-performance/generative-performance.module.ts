import { Module } from '@nestjs/common';
import { GenerativePerformanceService } from './generative-performance.service';
import { GenerativePerformanceAnalyzerModule } from './generative-performance-analyzer/generative-performance-analyzer.module';

@Module({
  imports: [GenerativePerformanceAnalyzerModule],
  providers: [GenerativePerformanceService],
  exports: [GenerativePerformanceService],
})
export class GenerativePerformanceModule {}
