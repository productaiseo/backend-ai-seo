import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthBetterService } from './auth-better.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { Account, AccountSchema } from './schemas/account.schema';
import {
  Verification,
  VerificationSchema,
} from './schemas/verification.schema';
import { AuthEmailService } from '../auth/services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Verification.name, schema: VerificationSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthBetterService, AuthEmailService],
  exports: [AuthBetterService, AuthEmailService],
})
export class AuthBetterModule {}
