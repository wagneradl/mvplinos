import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProdutosModule } from './produtos/produtos.module';
import { ClientesModule } from './clientes/clientes.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, ProdutosModule, ClientesModule, PedidosModule, HealthModule],
})
export class AppModule {}