import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Debug: Log environment variables (remove in production!)
  console.log('=== Environment Variables Check ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ Missing');
  console.log(
    'OPENAI_API_KEY:',
    process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing',
  );
  console.log(
    'GEMINI_API_KEY:',
    process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing',
  );
  console.log(
    'GOOGLE_GEMINI_API_KEY:',
    process.env.GOOGLE_GEMINI_API_KEY ? '✓ Set' : '✗ Missing',
  );
  console.log(
    'GOOGLE_PAGESPEED_API_KEY:',
    process.env.GOOGLE_PAGESPEED_API_KEY ? '✓ Set' : '✗ Missing',
  );
  console.log('===================================');

  // Set global prefix
  app.setGlobalPrefix('api');

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
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);

  console.log(`Application is running on port ${port}`);
}
bootstrap();
