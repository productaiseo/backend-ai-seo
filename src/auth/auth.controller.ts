import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { AuthBetterService } from './auth-better.service';
import {
  SignUpDto,
  SignInDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import {
  Session,
  AllowAnonymous,
  OptionalAuth,
} from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthBetterService) {}

  // ============================================
  // PUBLIC ROUTES (Anonymous Access)
  // ============================================

  @Post('signup')
  @AllowAnonymous()
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto, @Request() req: ExpressRequest) {
    return this.authService.signUp(signUpDto, req);
  }

  @Post('signin')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Request() req: ExpressRequest) {
    return this.authService.signIn(signInDto, req);
  }

  @Post('forgot-password')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto, req);
  }

  @Post('reset-password/:token')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.resetPassword(token, resetPasswordDto, req);
  }

  @Post('verify-email')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.verifyEmail(verifyEmailDto, req);
  }

  @Post('resend-verification')
  @AllowAnonymous()
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() body: { email: string },
    @Request() req: ExpressRequest,
  ) {
    return this.authService.resendVerification(body.email, req);
  }

  // ============================================
  // PROTECTED ROUTES (Authentication Required)
  // ============================================

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Session() session: UserSession) {
    return this.authService.getProfile(session);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Session() session: UserSession,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(session, updateProfileDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Session() session: UserSession,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.changePassword(session, changePasswordDto, req);
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Session() session: UserSession,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.signOut(session, req);
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(
    @Session() session: UserSession,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.getSessions(session, req);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Session() session: UserSession,
    @Param('sessionId') sessionId: string,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.revokeSession(session, sessionId, req);
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Session() session: UserSession,
    @Request() req: ExpressRequest,
  ) {
    return this.authService.revokeAllSessions(session, req);
  }

  // ============================================
  // OPTIONAL AUTH ROUTES
  // ============================================

  @Get('check')
  @OptionalAuth()
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/require-await
  async checkAuth(@Session() session: UserSession | null) {
    return {
      authenticated: !!session,
      user: session?.user || null,
    };
  }
}
