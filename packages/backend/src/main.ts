import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import * as express from 'express';
import { ensureAdminUser } from './bootstrap/ensure-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitando CORS
  app.enableCors();
  
  // Configurando validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Configurando acesso a arquivos estáticos
  // Determinar o caminho correto com base nas variáveis de ambiente
  const uploadsPath = process.env.UPLOADS_PATH 
    ? join(process.env.UPLOADS_PATH) 
    : join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadsPath));
  
  // Configurando Swagger para documentação da API
  const config = new DocumentBuilder()
    .setTitle('Lino\'s Panificadora API')
    .setDescription('API para gestão da padaria Lino\'s')
    .setVersion('1.0')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Porta a ser usada pelo servidor
  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  
  // Garante admin após o app estar pronto
  ensureAdminUser().catch(console.error);

  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Documentação Swagger disponível em: http://localhost:${port}/api`);
  console.log(`Variáveis de ambiente: NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`Diretório de uploads: ${uploadsPath}`);
}

bootstrap();
