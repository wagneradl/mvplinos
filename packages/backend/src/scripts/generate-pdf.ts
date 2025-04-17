import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PedidosService } from '../pedidos/pedidos.service';
import { PedidoStatus } from '../pedidos/dto/update-pedido.dto';

async function generatePdf() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const pedidosService = app.get(PedidosService);

    // Buscar o pedido mais recente usando a paginação padrão
    const { data: pedidos } = await pedidosService.findAll({ page: 1, limit: 1 });
    const pedido = pedidos[0];
    if (!pedido) throw new Error('Nenhum pedido encontrado para gerar PDF.');

    // Atualizar status e gerar PDF
    await pedidosService.update(pedido.id, { status: PedidoStatus.ATIVO });
    console.log('PDF gerado com sucesso para o pedido:', pedido.id);
    await app.close();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    process.exit(1);
  }
}

generatePdf();
