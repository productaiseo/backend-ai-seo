/* eslint-disable @typescript-eslint/no-base-to-string */
import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import type { Request as ExpressRequest } from 'express';
import type { User } from '../schemas/user.schema';
import type { Session } from '../schemas/session.schema';

export class SessionHelper {
  private static readonly logger = new Logger(SessionHelper.name);

  /**
   * Extract session token from request headers
   * Checks both Cookie header and Authorization header
   * @param req Express request object
   * @returns Session token or null if not found
   */
  static getSessionTokenFromRequest(req: ExpressRequest): string | null {
    // Try to get from cookies first
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      const sessionCookie = cookies.find((c) =>
        c.startsWith('better-auth.session_token='),
      );
      if (sessionCookie) {
        const token = sessionCookie.split('=')[1];
        this.logger.debug(
          `Session token found in cookie: ${token.substring(0, 10)}...`,
        );
        return token;
      }
    }

    // Try to get from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      this.logger.debug(
        `Session token found in Authorization header: ${token.substring(0, 10)}...`,
      );
      return token;
    }

    this.logger.debug('No session token found in request');
    return null;
  }

  /**
   * Get session and user data directly from MongoDB
   * Validates session expiration and returns formatted data
   * @param token Session token to lookup
   * @param sessionModel Mongoose Session model
   * @param userModel Mongoose User model
   * @returns Object containing user and session data, or null if not found/expired
   */
  static async getSessionFromDB(
    token: string,
    sessionModel: Model<Session>,
    userModel: Model<User>,
  ): Promise<{
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      emailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
      ipAddress?: string;
      userAgent?: string;
    };
  } | null> {
    try {
      // Find session by token
      const session = await sessionModel.findOne({ token }).lean();

      if (!session) {
        this.logger.debug('Session not found in database');
        return null;
      }

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        this.logger.debug('Session has expired');
        return null;
      }

      // Find user by session's userId
      const user = await userModel.findById(session.userId).lean();

      if (!user) {
        this.logger.debug('User not found for session');
        return null;
      }

      // Return formatted data
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

  /**
   * Validate if a session exists and is not expired
   * @param token Session token
   * @param sessionModel Mongoose Session model
   * @returns true if session is valid, false otherwise
   */
  static async isSessionValid(
    token: string,
    sessionModel: Model<Session>,
  ): Promise<boolean> {
    try {
      const session = await sessionModel.findOne({ token }).lean();

      if (!session) {
        return false;
      }

      return new Date(session.expiresAt) >= new Date();
    } catch (error) {
      this.logger.error('Error validating session:', error);
      return false;
    }
  }

  /**
   * Get all sessions for a specific user
   * @param userId User ID
   * @param sessionModel Mongoose Session model
   * @param currentToken Optional current session token to mark as current
   * @returns Array of formatted session objects
   */
  static async getUserSessions(
    userId: string,
    sessionModel: Model<Session>,
    currentToken?: string,
  ): Promise<
    Array<{
      id: string;
      token: string;
      userId: string;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
      ipAddress?: string;
      userAgent?: string;
      isCurrent: boolean;
    }>
  > {
    try {
      const sessions = await sessionModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return sessions.map((s) => ({
        id: s._id.toString(),
        token: s.token,
        userId: s.userId.toString(),
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        isCurrent: currentToken ? s.token === currentToken : false,
      }));
    } catch (error) {
      this.logger.error('Error fetching user sessions:', error);
      return [];
    }
  }

  /**
   * Delete a specific session
   * @param sessionId Session ID to delete
   * @param sessionModel Mongoose Session model
   * @returns true if deleted, false otherwise
   */
  static async deleteSession(
    sessionId: string,
    sessionModel: Model<Session>,
  ): Promise<boolean> {
    try {
      const result = await sessionModel.deleteOne({ _id: sessionId });
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Delete session by token
   * @param token Session token
   * @param sessionModel Mongoose Session model
   * @returns true if deleted, false otherwise
   */
  static async deleteSessionByToken(
    token: string,
    sessionModel: Model<Session>,
  ): Promise<boolean> {
    try {
      const result = await sessionModel.deleteOne({ token });
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error('Error deleting session by token:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user except the current one
   * @param userId User ID
   * @param currentToken Token of the session to keep
   * @param sessionModel Mongoose Session model
   * @returns Number of sessions deleted
   */
  static async revokeOtherSessions(
    userId: string,
    currentToken: string,
    sessionModel: Model<Session>,
  ): Promise<number> {
    try {
      const result = await sessionModel.deleteMany({
        userId,
        token: { $ne: currentToken },
      });
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error revoking other sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions from database
   * @param sessionModel Mongoose Session model
   * @returns Number of expired sessions deleted
   */
  static async cleanupExpiredSessions(
    sessionModel: Model<Session>,
  ): Promise<number> {
    try {
      const result = await sessionModel.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      this.logger.log(`Cleaned up ${result.deletedCount} expired sessions`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }
}
