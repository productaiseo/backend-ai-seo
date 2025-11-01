// import { IsString, IsNotEmpty } from 'class-validator';

export class ScrapeUrlDto {
  //   @IsString()
  //   @IsNotEmpty()
  url: string;
}

export interface ScrapeResult {
  html: string;
  content: string;
  robotsTxt?: string;
  llmsTxt?: string;
  screenshot?: Buffer;
  performanceMetrics: any;
}
