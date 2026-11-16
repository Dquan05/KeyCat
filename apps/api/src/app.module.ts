import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PersistenceModule } from './persistence/persistence.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { PracticeModule } from './practice/practice.module';
import { ProgressModule } from './progress/progress.module';
import { SpeedModule } from './speed/speed.module';

@Module({
  imports: [
    PersistenceModule,
    AuthModule,
    CatalogModule,
    ProgressModule,
    PracticeModule,
    SpeedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
