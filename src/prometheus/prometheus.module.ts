import { Module } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { ScoringModule } from '../scoring/scroring.module';

@Module({
  imports: [ScoringModule],
  providers: [PrometheusService],
  exports: [PrometheusService],
})
export class PrometheusModule {}
