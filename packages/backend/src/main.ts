import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import express from 'express';
import * as cors from 'cors';
import { ensureAdminUser } from './bootstrap/ensure-admin';

async function bootstrap() {
  const server = express();

  // CORS via Express
  server.use(
    cors({
      origin: 'https://linos-frontend-6wef.onrender.com',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Preflight (OPTIONS) handler
  server.options('*', cors());

  const app = await NestFactory.create(AppModule, { bodyParser: true, rawBody: false, cors: false });
  app.use(server);

  // Configurando validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Configurando acesso a arquivos estáticos
  const uploadsPath = process.env.UPLOADS_PATH 
    ? join(process.env.UPLOADS_PATH) 
    : join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadsPath));

  // Tratamento global para OPTIONS (CORS preflight)
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

  // Configurando Swagger para documentação da API
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
  console.log(`Variáveis de ambiente: NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`Diretório de uploads: ${uploadsPath}`);
}

bootstrap();