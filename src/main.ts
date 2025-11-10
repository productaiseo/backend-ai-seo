import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { initializeBetterAuthDB } from './utils/db';
// import { initializeAuthEmailService, initializeAuth } from './utils/auth';
// import { AuthEmailService } from './auth/services/email.service';

async function bootstrap() {
  // Initialize MongoDB connection for Better Auth
  await initializeBetterAuthDB();

  // Initialize Better Auth (after DB is ready)
  // initializeAuth();

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

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
  // const emailSvc = app.get(AuthEmailService);
  // initializeAuthEmailService(emailSvc);

  // Set global prefix
  // app.setGlobalPrefix('api');

  // Add validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Configure CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://mvp.aiseoptimizer.com'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 204,
  });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

bootstrap();
