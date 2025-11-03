import { Module } from '@nestjs/common';
import { LirService } from './lir.service';

@Module({
  providers: [LirService],
  exports: [LirService],
})
export class LirModule {}
