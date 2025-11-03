import { Module } from '@nestjs/common';
import { ArkheService } from './arkhe.service';

@Module({
  providers: [ArkheService],
  exports: [ArkheService],
})
export class ArkheModule {}
