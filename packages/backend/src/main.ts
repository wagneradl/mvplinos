import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import express from 'express';
import { AppModule } from './app.module';
import { ensureAdminUser } from './bootstrap/ensure-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  // CORS (origins from CORS_ORIGINS env or fallback list)
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : process.env.NODE_ENV === 'production'
      ? ['https://linos-frontend-6wef.onrender.com']
      : ['http://localhost:3000', 'https://linos-frontend-6wef.onrender.com'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'), false);
      }
    },
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  // Pipes globais
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Static uploads
  const uploadsPath = process.env.UPLOADS_PATH
    ? join(process.env.UPLOADS_PATH)
    : join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadsPath));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Lino's Panificadora API")
    .setDescription("API para gestão da padaria Lino's")
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  ensureAdminUser().catch(console.error);

  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Documentação Swagger disponível em: http://localhost:${port}/api`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Uploads: ${uploadsPath}`);
}

bootstrap();