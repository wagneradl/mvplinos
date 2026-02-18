import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import express from 'express';
import { AppModule } from './app.module';
import { debugLog } from './common/utils/debug-log';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS Configuration
  // Em produção, usar a configuração padrão do NestJS
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['https://linos-frontend-6wef.onrender.com', 'https://sistema.linospanificadora.com'];

    debugLog('Bootstrap', `[CORS] Ambiente de produção, origens permitidas:`, allowedOrigins);

    app.enableCors({
      origin: (origin, callback) => {
        // Permitir requisições sem origem (como de health checks internos)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          debugLog('Bootstrap', `[CORS] Bloqueando requisição de origem não permitida: ${origin}`);
          callback(new Error(`CORS não permitido para origem: ${origin}`), false);
        }
      },
      methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true,
      optionsSuccessStatus: 204,
    });
  }
  // Em desenvolvimento, usar a configuração CORS do NestJS para localhost
  else {
    debugLog('Bootstrap', '[CORS] Ambiente de desenvolvimento, configurando CORS para localhost');

    // Usar o enableCors do NestJS com regex para localhost em qualquer porta
    app.enableCors({
      origin: /^https?:\/\/localhost:\d+$/,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    debugLog('Bootstrap', '[CORS] CORS configurado para permitir apenas hosts de desenvolvimento');
  }

  // Configurar validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // forbidNonWhitelisted: true, // Removido para evitar erro em queries GET
    }),
  );

  // Static uploads
  const uploadsPath = process.env.UPLOADS_PATH
    ? join(process.env.UPLOADS_PATH)
    : join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadsPath));

  // Configurar Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle("Lino's Panificadora API")
      .setDescription("API para gestão da padaria Lino's")
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    debugLog(
      'Bootstrap',
      `Documentação Swagger disponível em: http://localhost:${process.env.PORT || 3001}/api`,
    );
  } else {
    debugLog('Bootstrap', 'Swagger desabilitado em ambiente de produção por motivos de segurança');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  debugLog('Bootstrap', `Servidor rodando na porta ${port}`);
  debugLog('Bootstrap', `NODE_ENV: ${process.env.NODE_ENV}`);
  debugLog('Bootstrap', `Uploads: ${uploadsPath}`);
}

bootstrap();
