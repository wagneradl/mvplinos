import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS Configuration
  // Definir origens permitidas com base no ambiente
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : process.env.NODE_ENV === 'production'
      ? ['https://linos-frontend-6wef.onrender.com'] // Apenas produção em ambiente de produção
      : [
          'http://localhost:3000',     // Next.js dev server padrão
          'http://127.0.0.1:3000',      // Alternativa localhost
          'http://localhost:8080',      // Porta alternativa possível
          'http://127.0.0.1:8080'       // Porta alternativa possível
        ];
  
  console.log(`[CORS] Ambiente: ${process.env.NODE_ENV}, Origens permitidas:`, allowedOrigins);

  // Configuração CORS aprimorada
  app.enableCors({
    origin: (origin, callback) => {
      // Em desenvolvimento, permitir requisições sem origem (como curl/postman)
      const isDev = process.env.NODE_ENV !== 'production';
      
      if (!origin && isDev) {
        console.log('[CORS] Permitindo requisição sem origem em ambiente de desenvolvimento');
        callback(null, true);
        return;
      }
      
      if (allowedOrigins.includes(origin)) {
        console.log(`[CORS] Origem permitida: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`[CORS] Origem bloqueada: ${origin}`);
        callback(new Error(`CORS não permitido para origem: ${origin}`), false);
      }
    },
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept,Origin,X-Requested-With',
    exposedHeaders: 'Content-Disposition',  // Para download de arquivos
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 3600  // Cache preflight por 1 hora
  });

  // Pipes globais
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    // forbidNonWhitelisted: true, // Removido para evitar erro em queries GET
  }));

  // Static uploads
  const uploadsPath = process.env.UPLOADS_PATH
    ? join(process.env.UPLOADS_PATH)
    : join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadsPath));

  // Swagger - apenas em ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle("Lino's Panificadora API")
      .setDescription("API para gestão da padaria Lino's")
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    
    console.log(`Documentação Swagger disponível em: http://localhost:${process.env.PORT || 3001}/api`);
  } else {
    console.log('Swagger desabilitado em ambiente de produção por motivos de segurança');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Servidor rodando na porta ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Uploads: ${uploadsPath}`);
}

bootstrap();