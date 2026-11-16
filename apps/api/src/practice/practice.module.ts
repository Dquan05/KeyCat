import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [AuthModule, ProgressModule],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
