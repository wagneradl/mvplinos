import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PedidosService } from '../pedidos/pedidos.service';
import { PedidoStatus } from '../pedidos/dto/update-pedido.dto';

async function generatePdf() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const pedidosService = app.get(PedidosService);

    // Buscar o pedido com ID 1 e gerar o PDF
    const pedido = await pedidosService.findOne(1);
    await pedidosService.update(1, { status: PedidoStatus.ATIVO });

    console.log('PDF gerado com sucesso para o pedido:', pedido);
    await app.close();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    process.exit(1);
  }
}

generatePdf();
