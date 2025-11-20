/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Session } from './schemas/session.schema';
import { auth } from '../utils/auth';
import type { Request as ExpressRequest } from 'express';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  SignUpDto,
  SignInDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@Injectable()
export class AuthBetterService {
  constructor(
    private authService: AuthService<typeof auth>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  // ============================================
  // SIGN UP
  // ============================================
  async signUp(signUpDto: SignUpDto, req: ExpressRequest) {
    try {
      const result = await this.authService.api.signUpEmail({
        body: {
          email: signUpDto.email,
          password: signUpDto.password,
          name: signUpDto.name,
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Account created successfully. Please verify your email.',
        user: result.user,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to create account',
      );
    }
  }

  // ============================================
  // SIGN IN
  // ============================================
  async signIn(signInDto: SignInDto, req: ExpressRequest) {
    try {
      const result = await this.authService.api.signInEmail({
        body: {
          email: signInDto.email,
          password: signInDto.password,
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Signed in successfully',
        user: result.user,
        session: result.token,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  // ============================================
  // SIGN OUT
  // ============================================
  async signOut(session: UserSession, req: ExpressRequest) {
    try {
      await this.authService.api.signOut({
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Signed out successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to sign out');
    }
  }

  // ============================================
  // FORGOT PASSWORD
  // ============================================
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    req: ExpressRequest,
  ) {
    try {
      await this.authService.api.forgetPassword({
        body: {
          email: forgotPasswordDto.email,
          redirectTo: forgotPasswordDto.redirectUrl || '/reset-password',
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };
    } catch (error) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      };
    }
  }

  // ============================================
  // RESET PASSWORD
  // ============================================
  async resetPassword(resetPasswordDto: ResetPasswordDto, req: ExpressRequest) {
    try {
      // Extract token from query params
      const token = req.query.token as string;
      if (!token) {
        throw new BadRequestException('Verification token is required');
      }

      await this.authService.api.resetPassword({
        body: {
          newPassword: resetPasswordDto.newPassword,
        },
        query: {
          token, // ✅ Fixed: added required query parameter
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to reset password. The link may have expired.',
      );
    }
  }

  // ============================================
  // CHANGE PASSWORD
  // ============================================
  async changePassword(
    session: UserSession,
    changePasswordDto: ChangePasswordDto,
    req: ExpressRequest,
  ) {
    try {
      await this.authService.api.changePassword({
        body: {
          currentPassword: changePasswordDto.currentPassword,
          newPassword: changePasswordDto.newPassword,
          revokeOtherSessions: changePasswordDto.revokeOtherSessions || false,
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to change password. Please check your current password.',
      );
    }
  }

  // ============================================
  // VERIFY EMAIL
  // ============================================
  async verifyEmail(verifyEmailDto: VerifyEmailDto, req: ExpressRequest) {
    try {
      // Extract token from query params
      const token = req.query.token as string;

      if (!token) {
        throw new BadRequestException('Verification token is required');
      }

      await this.authService.api.verifyEmail({
        query: {
          token, // ✅ Fixed: added required query parameter
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to verify email. The link may have expired.',
      );
    }
  }

  // ============================================
  // RESEND VERIFICATION EMAIL
  // ============================================
  async resendVerification(email: string, req: ExpressRequest) {
    try {
      await this.authService.api.sendVerificationEmail({
        body: {
          email,
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Verification email sent',
      };
    } catch (error) {
      return {
        success: true,
        message: 'If the email exists, a verification link has been sent.',
      };
    }
  }

  // ============================================
  // GET PROFILE
  // ============================================

  // eslint-disable-next-line @typescript-eslint/require-await
  async getProfile(session: UserSession) {
    return {
      success: true,
      user: session.user,
      session: session.session,
    };
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================
  async updateProfile(
    session: UserSession,
    updateProfileDto: UpdateProfileDto,
  ) {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        session.user.id,
        {
          $set: {
            name: updateProfileDto.name,
            image: updateProfileDto.image,
            updatedAt: new Date(),
          },
        },
        { new: true },
      );

      return {
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      throw new BadRequestException('Failed to update profile');
    }
  }

  // ============================================
  // GET SESSIONS
  // ============================================
  async getSessions(session: UserSession, req: ExpressRequest) {
    try {
      const sessions = await this.authService.api.listSessions({
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch sessions');
    }
  }

  // ============================================
  // REVOKE SESSION
  // ============================================
  async revokeSession(
    session: UserSession,
    sessionId: string,
    req: ExpressRequest,
  ) {
    try {
      await this.authService.api.revokeSession({
        body: {
          token: sessionId,
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to revoke session');
    }
  }

  // ============================================
  // REVOKE ALL SESSIONS
  // ============================================
  async revokeAllSessions(session: UserSession, req: ExpressRequest) {
    try {
      await this.authService.api.revokeOtherSessions({
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'All other sessions revoked successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to revoke sessions');
    }
  }
}
