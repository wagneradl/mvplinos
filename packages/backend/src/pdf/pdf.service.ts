import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { readFileSync } from 'fs';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly pdfDir = join(process.cwd(), 'uploads', 'pdfs');

  constructor() {
    // Garantir que o diretório de PDFs existe
    mkdir(this.pdfDir, { recursive: true });
  }

  async generatePedidoPdf(pedidoData: any): Promise<string> {
    let browser;
    try {
      this.logger.log(`Iniciando geração de PDF para pedido ${pedidoData.id}`);
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      
      // URL da logo (servida como arquivo estático)
      const logoUrl = 'http://localhost:3001/uploads/images/logo.png';
      this.logger.log(`Usando logo de: ${logoUrl}`);

      // Gerar HTML com logo
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { width: 160px; height: auto; margin-bottom: 10px; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { margin-top: 20px; text-align: right; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${logoUrl}" alt="Lino's Padaria" class="logo" />
              <h1>Lino's Padaria</h1>
              <h2>Pedido #${pedidoData.id}</h2>
            </div>
            
            <div class="info">
              <h3>Dados do Cliente</h3>
              <p>Razão Social: ${pedidoData.cliente.razao_social}</p>
              <p>CNPJ: ${pedidoData.cliente.cnpj}</p>
              <p>Telefone: ${pedidoData.cliente.telefone}</p>
              <p>Email: ${pedidoData.cliente.email}</p>
            </div>

            <h3>Itens do Pedido</h3>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Preço Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${pedidoData.itensPedido.map(item => `
                  <tr>
                    <td>${item.produto.nome}</td>
                    <td>${item.quantidade} ${item.produto.tipo_medida}</td>
                    <td>R$ ${item.preco_unitario.toFixed(2)}</td>
                    <td>R$ ${item.valor_total_item.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total">
              <p>Total do Pedido: R$ ${pedidoData.valor_total.toFixed(2)}</p>
            </div>

            <div class="info">
              <p>Data do Pedido: ${new Date(pedidoData.data_pedido).toLocaleString()}</p>
              <p>Status: ${pedidoData.status}</p>
            </div>
          </body>
        </html>
      `;

      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfPath = join(this.pdfDir, `pedido-${pedidoData.id}.pdf`);
      this.logger.log(`Gerando PDF em: ${pdfPath}`);
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });
      
      this.logger.log(`PDF gerado com sucesso para pedido ${pedidoData.id}`);
      
      // Retorna o caminho relativo para salvar no banco
      return `uploads/pdfs/pedido-${pedidoData.id}.pdf`;
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF para pedido ${pedidoData.id}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
