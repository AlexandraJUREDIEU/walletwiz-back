import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { MembersModule } from './members/members.module';
import { BanksModule } from './banks/banks.module';
import { IncomesModule } from './incomes/incomes.module';

@Module({
  imports: [UsersModule, AuthModule, SessionsModule, MembersModule, BanksModule, IncomesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
