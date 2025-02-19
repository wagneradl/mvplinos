import { Module } from '@nestjs/common';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProdutosController],
  providers: [ProdutosService, PrismaService],
  exports: [ProdutosService],
})
export class ProdutosModule {}