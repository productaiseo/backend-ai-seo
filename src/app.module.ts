import { Module, OnModuleInit, Logger } from '@nestjs/common';
// import { AuthModule } from '@thallesp/nestjs-better-auth';
// import { auth } from './utils/auth';
// import { AuthBetterModule } from './auth/auth.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ReportsModule } from './reports/reports.module';
import { ScraperModule } from './test/puppeteer/scraper.module';
import { PerformanceModule } from './performance/performance.module';
import { ArkheModule } from './arkhe/arkhe.module';
import { JobStatusModule } from './jobstatus/job-status.module';
import { StartAnalysisModule } from './startanalysis/start-analysis.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { PrometheusModule } from './prometheus/prometheus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      cache: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string, {}),
    // AuthModule.forRoot({ auth }),
    // AuthBetterModule,
    ReportsModule,
    ScraperModule,
    PerformanceModule,
    ArkheModule,
    PrometheusModule,
    JobStatusModule,
    StartAnalysisModule,
    OrchestrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log('AppModule initialized');
    this.logger.log('Environment variables loaded');

    // Debug: Check if API keys are loaded
    this.logger.log(`OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
    this.logger.log(
      `Gemini configured: ${!!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY)}`,
    );
    this.logger.log(
      `PSI configured: ${!!(process.env.GOOGLE_PAGESPEED_API_KEY || process.env.PSI_API_KEY)}`,
    );

    this.logger.log('ScraperModule should be loaded');
    this.logger.log('PerformanceModule should be loaded');
    this.logger.log('ArkheModule should be loaded');
    this.logger.log('JobStatusModule should be loaded');
    this.logger.log('StartAnalysisModule should be loaded');
    this.logger.log('OrchestrationModule should be loaded');
    this.logger.log('PrometheusModule should be loaded');
  }
}
