/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { initializeBetterAuthDB } from './utils/db';
import { initializeAuthEmailService, initializeAuth } from './utils/auth';
import { AuthEmailService } from './auth/services/email.service';

async function bootstrap() {
  // Initialize MongoDB connection for Better Auth
  await initializeBetterAuthDB();

  // Initialize Better Auth (after DB is ready)
  initializeAuth();

  const app = await NestFactory.create(AppModule, {});

  // Debug logs
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ Missing');
  console.log(
    'BETTER_AUTH_SECRET:',
    process.env.BETTER_AUTH_SECRET ? '✓ Set' : '✗ Missing',
  );
  console.log(
    'Better Auth URL:',
    process.env.BETTER_AUTH_URL ? '✓ Set' : '✗ Missing',
  );

  // Hand the DI instance to your Better Auth callbacks
  const emailSvc = app.get(AuthEmailService);
  initializeAuthEmailService(emailSvc);

  // Add validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Configure CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://mvp.aiseoptimizer.com',
        'https://api.aiseoptimizer.com',
      ];

      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-Requested-With',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

bootstrap();
