/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class StartAnalysisDto {
  @ValidateIf((o) => !o.domain)
  @IsString()
  url?: string;

  @ValidateIf((o) => !o.url)
  @IsString()
  domain?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
