import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpeedController } from './speed.controller';
import { SpeedService } from './speed.service';

@Module({
  imports: [AuthModule],
  controllers: [SpeedController],
  providers: [SpeedService],
})
export class SpeedModule {}
