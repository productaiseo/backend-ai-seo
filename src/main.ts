/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);

  console.log(`Application is running on port ${port}`);
}
bootstrap();
