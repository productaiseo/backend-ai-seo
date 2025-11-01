/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Configure CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'https://mvp.aiseoptimizer.com'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
