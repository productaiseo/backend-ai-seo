/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Session } from './schemas/session.schema';
// import { Verification } from './schemas/verification.schema';
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
  private readonly logger = new Logger(AuthBetterService.name);

  constructor(
    private readonly authService: AuthService<typeof auth>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    // @InjectModel(Verification.name) private readonly verificationModel: Model<Verification>,
  ) {}

  // Helper method to extract session token from request
  private getSessionTokenFromRequest(req: ExpressRequest): string | null {
    // Try to get from cookies first
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      const sessionCookie = cookies.find((c) =>
        c.startsWith('better-auth.session_token='),
      );
      if (sessionCookie) {
        return sessionCookie.split('=')[1];
      }
    }

    // Try to get from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  // Helper method to get session directly from MongoDB
  private async getSessionFromDB(
    token: string,
  ): Promise<{ user: any; session: any } | null> {
    try {
      const session = await this.sessionModel.findOne({ token }).lean();

      if (!session || new Date(session.expiresAt) < new Date()) {
        return null;
      }

      const user = await this.userModel.findById(session.userId).lean();

      if (!user) {
        return null;
      }

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        session: {
          id: session._id.toString(),
          userId: session.userId.toString(),
          expiresAt: session.expiresAt,
          token: session.token,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching session from DB:', error);
      return null;
    }
  }

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
  async signOut(session: UserSession | null, req: ExpressRequest) {
    try {
      const token = this.getSessionTokenFromRequest(req);

      if (!token) {
        throw new UnauthorizedException('No session token found');
      }

      // Delete session from database directly
      await this.sessionModel.deleteOne({ token });

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
      // Better Auth handles sending the email via the sendResetPassword callback
      const user = await this.userModel.findOne({
        email: forgotPasswordDto.email,
      });

      if (!user) {
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent.',
        };
      }

      // sendResetPassword callback configured in utils/auth.ts
      const resetUrl = `${process.env.BETTER_AUTH_URL}/auth/forgot-password`;

      const response = await fetch(resetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...fromNodeHeaders(req.headers),
        },
        body: JSON.stringify({
          email: forgotPasswordDto.email,
          redirectTo: forgotPasswordDto.redirectUrl || '/reset-password',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate password reset');
      }

      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };
    } catch (error) {
      this.logger.error('Forgot password error:', error);
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      };
    }
  }

  // ============================================
  // RESET PASSWORD
  // ============================================
  async resetPassword(
    token: string,
    resetPasswordDto: ResetPasswordDto,
    req: ExpressRequest,
  ) {
    try {
      await this.authService.api.resetPassword({
        body: {
          newPassword: resetPasswordDto.newPassword,
        },
        query: {
          token,
        },
        headers: fromNodeHeaders(req.headers),
      });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      this.logger.error('Reset password error:', error);
      throw new BadRequestException(
        'Failed to reset password. The link may have expired.',
      );
    }
  }

  // ============================================
  // CHANGE PASSWORD
  // ============================================
  async changePassword(
    session: UserSession | null,
    changePasswordDto: ChangePasswordDto,
    req: ExpressRequest,
  ) {
    try {
      // Verify session first
      const token = this.getSessionTokenFromRequest(req);
      if (!token) {
        throw new UnauthorizedException('No session found');
      }

      const sessionData = await this.getSessionFromDB(token);
      if (!sessionData) {
        throw new UnauthorizedException('Invalid or expired session');
      }

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
          token,
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
  async getProfile(session: UserSession | null, req: ExpressRequest) {
    try {
      this.logger.log('Getting profile...');

      // Get session token from request
      const token = this.getSessionTokenFromRequest(req);
      this.logger.log('Session token:', token ? 'Found' : 'Not found');

      if (!token) {
        throw new UnauthorizedException('No session token found');
      }

      // Get session directly from database
      const sessionData = await this.getSessionFromDB(token);
      this.logger.log('Session from DB:', sessionData ? 'Found' : 'Not found');

      if (!sessionData) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      return {
        success: true,
        user: sessionData.user,
        session: sessionData.session,
      };
    } catch (error) {
      this.logger.error('Get profile error:', error);
      throw new UnauthorizedException('Failed to get profile');
    }
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================
  async updateProfile(
    session: UserSession | null,
    updateProfileDto: UpdateProfileDto,
    req: ExpressRequest,
  ) {
    try {
      const token = this.getSessionTokenFromRequest(req);
      if (!token) {
        throw new UnauthorizedException('No session found');
      }

      const sessionData = await this.getSessionFromDB(token);
      if (!sessionData) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        sessionData.user.id,
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
  async getSessions(session: UserSession | null, req: ExpressRequest) {
    try {
      this.logger.log('Getting sessions...');

      const token = this.getSessionTokenFromRequest(req);
      this.logger.log('Session token:', token ? 'Found' : 'Not found');

      if (!token) {
        throw new UnauthorizedException('No session token found');
      }

      // Get current session from DB to get user ID
      const currentSession = await this.getSessionFromDB(token);
      if (!currentSession) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Get all sessions for this user
      const sessions = await this.sessionModel
        .find({ userId: currentSession.session.userId })
        .sort({ createdAt: -1 })
        .lean();

      const formattedSessions = sessions.map((s) => ({
        id: s._id.toString(),
        token: s.token,
        userId: s.userId.toString(),
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        isCurrent: s.token === token,
      }));

      return {
        success: true,
        sessions: formattedSessions,
      };
    } catch (error) {
      this.logger.error('Failed to fetch sessions:', error);
      throw new BadRequestException(
        'Failed to fetch sessions: ' + error.message,
      );
    }
  }

  // ============================================
  // REVOKE SESSION
  // ============================================
  async revokeSession(
    session: UserSession | null,
    sessionId: string,
    req: ExpressRequest,
  ) {
    try {
      const token = this.getSessionTokenFromRequest(req);
      if (!token) {
        throw new UnauthorizedException('No session found');
      }

      const currentSession = await this.getSessionFromDB(token);
      if (!currentSession) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Don't allow revoking current session via this endpoint
      const sessionToRevoke = await this.sessionModel.findById(sessionId);
      if (!sessionToRevoke) {
        throw new BadRequestException('Session not found');
      }

      if (sessionToRevoke.token === token) {
        throw new BadRequestException(
          'Cannot revoke current session. Use signout instead.',
        );
      }

      // Verify the session belongs to the current user
      if (sessionToRevoke.userId.toString() !== currentSession.session.userId) {
        throw new UnauthorizedException(
          'Cannot revoke session of another user',
        );
      }

      await this.sessionModel.deleteOne({ _id: sessionId });

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to revoke session: ' + error.message,
      );
    }
  }

  // ============================================
  // REVOKE ALL SESSIONS
  // ============================================
  async revokeAllSessions(session: UserSession | null, req: ExpressRequest) {
    try {
      const token = this.getSessionTokenFromRequest(req);
      if (!token) {
        throw new UnauthorizedException('No session found');
      }

      const currentSession = await this.getSessionFromDB(token);
      if (!currentSession) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Delete all sessions except current one
      const result = await this.sessionModel.deleteMany({
        userId: currentSession.session.userId,
        token: { $ne: token },
      });

      return {
        success: true,
        message: `Revoked ${result.deletedCount} other session(s) successfully`,
        revokedCount: result.deletedCount,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to revoke sessions: ' + error.message,
      );
    }
  }
}
