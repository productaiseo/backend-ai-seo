import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ReportsModule } from './reports/reports.module';
import { ScraperModule } from './scraper/scraper.module';
import { JobStatusModule } from './jobstatus/job-status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    }),
    ReportsModule,
    ScraperModule,
    JobStatusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log('AppModule initialized');
    this.logger.log('ScraperModule should be loaded');
    this.logger.log('JobStatusModule should be loaded');
  }
}
