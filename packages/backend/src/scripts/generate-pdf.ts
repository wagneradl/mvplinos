import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PedidosService } from '../pedidos/pedidos.service';

async function generatePdf() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const pedidosService = app.get(PedidosService);

    // Buscar o pedido mais recente usando a paginação padrão
    const { data: pedidos } = await pedidosService.findAll({ page: 1, limit: 1 });
    const pedido = pedidos[0];
    if (!pedido) throw new Error('Nenhum pedido encontrado para gerar PDF.');

    // Regenerar PDF do pedido
    await pedidosService.regeneratePdf(pedido.id);
    console.log('PDF gerado com sucesso para o pedido:', pedido.id);
    await app.close();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    process.exit(1);
  }
}

generatePdf();
