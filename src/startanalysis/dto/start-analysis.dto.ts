import { IsString, IsOptional } from 'class-validator';

export class StartAnalysisDto {
  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
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
