import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { getDbClient } from './db';
import { AuthEmailService } from '../auth/services/email.service';

// Initialize the email service
let authEmailService: AuthEmailService;

export const initializeAuthEmailService = (emailService: AuthEmailService) => {
  authEmailService = emailService;
};

// Create a getter function that returns the auth instance
let authInstance: ReturnType<typeof betterAuth> | null = null;

export const initializeAuth = () => {
  if (authInstance) {
    return authInstance;
  }

  authInstance = betterAuth({
    database: mongodbAdapter(getDbClient()),

    // Base configuration
    basePath: '/api/auth',
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        if (!authEmailService) {
          console.error('AuthEmailService not initialized');
          throw new Error('Email service not available');
        }
        try {
          await authEmailService.sendPasswordReset(user.email, url);
        } catch (error) {
          console.error('Failed to send password reset email:', error);
          throw error;
        }
      },
    },

    // Email verification
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        if (!authEmailService) {
          console.error('AuthEmailService not initialized');
          throw new Error('Email service not available');
        }
        try {
          await authEmailService.sendVerificationEmail(user.email, url);
        } catch (error) {
          console.error('Failed to send verification email:', error);
          throw error;
        }
      },
      sendOnSignUp: true,
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },

    // Trusted origins for CORS
    trustedOrigins: ['http://localhost:3000', 'https://mvp.aiseoptimizer.com'],

    // Advanced security options
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
      useSecureCookies: process.env.NODE_ENV === 'production',
    },

    // Social providers (add when ready)
    socialProviders: {
      // google: {
      //   clientId: process.env.GOOGLE_CLIENT_ID as string,
      //   clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // },
    },
  });

  return authInstance;
};

// Export getter for auth instance
export const getAuth = () => {
  if (!authInstance) {
    throw new Error('Auth not initialized. Call initializeAuth() first.');
  }
  return authInstance;
};

// For backward compatibility, you can also export a default
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get: (target, prop) => {
    const instance = getAuth();
    return instance[prop as keyof typeof instance];
  },
});
