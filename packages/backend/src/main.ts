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
  app.enableCors({
    origin: 'https://linos-frontend-6wef.onrender.com',
    credentials: true,
  });

  // OPTIONS handler para o preflight (sem exagerar permissões)
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', 'https://linos-frontend-6wef.onrender.com');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.sendStatus(204);
    }
    next();
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