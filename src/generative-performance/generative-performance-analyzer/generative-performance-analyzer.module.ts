import { Module } from '@nestjs/common';
import { GenerativePerformanceAnalyzerService } from './generative-performance-analyzer.service';

@Module({
  imports: [],
  providers: [GenerativePerformanceAnalyzerService],
  exports: [GenerativePerformanceAnalyzerService],
})
export class GenerativePerformanceAnalyzerModule {}
