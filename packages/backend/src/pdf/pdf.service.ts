import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { readFileSync, existsSync, writeFileSync } from 'fs';

@Injectable()
export class PdfService implements OnModuleInit {
  private readonly logger = new Logger(PdfService.name);
  private readonly pdfDir = join(process.cwd(), 'uploads', 'pdfs');
  private readonly logoPath = join(__dirname, '..', 'assets', 'images', 'logo.png');
  private readonly isTest = process.env.NODE_ENV === 'test';

  async onModuleInit() {
    // Garantir que os diretórios necessários existem
    await mkdir(this.pdfDir, { recursive: true });
    this.logger.log(`Diretórios inicializados: ${this.pdfDir}`);
    this.logger.log(`Logo path: ${this.logoPath}`);
    this.logger.log(`Logo exists: ${existsSync(this.logoPath)}`);
  }

  async generatePedidoPdf(pedidoData: any): Promise<string> {
    let browser;
    try {
      this.logger.log(`Iniciando geração de PDF para pedido ${pedidoData.id}`);
      
      // Validar dados do pedido
      if (!pedidoData || !pedidoData.cliente || !pedidoData.itensPedido) {
        throw new Error('Dados do pedido inválidos ou incompletos');
      }

      // Em ambiente de teste, gerar um PDF simples
      if (this.isTest) {
        const pdfPath = join(this.pdfDir, `pedido-${pedidoData.id}.pdf`);
        await mkdir(this.pdfDir, { recursive: true });
        
        // Criar um PDF vazio
        const emptyPDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf-8');
        writeFileSync(pdfPath, emptyPDF);
        
        return `uploads/pdfs/pedido-${pedidoData.id}.pdf`;
      }
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Se a logo existir, carregar como base64
      let logoBase64 = '';
      this.logger.log(`Verificando logo em: ${this.logoPath}`);
      if (existsSync(this.logoPath)) {
        this.logger.log('Logo encontrada, convertendo para base64');
        const logoBuffer = readFileSync(this.logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        this.logger.log(`Logo base64 length: ${logoBase64.length}`);
      } else {
        this.logger.warn('Logo não encontrada');
      }

      // Gerar timestamp único para evitar cache do PDF
      const timestamp = Date.now();
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Pedido #${pedidoData.id}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                max-width: 200px;
                margin-bottom: 20px;
              }
              .info {
                margin: 20px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                padding: 10px;
                border: 1px solid #ddd;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
              }
              .total {
                text-align: right;
                font-weight: bold;
                margin-top: 20px;
                font-size: 1.2em;
              }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo">` : ''}
              <h2>Pedido #${pedidoData.id}</h2>
            </div>

            <div class="info">
              <h3>Dados do Cliente</h3>
              <p>Razão Social: ${pedidoData.cliente.razao_social}</p>
              <p>Nome Fantasia: ${pedidoData.cliente.nome_fantasia}</p>
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

      await page.setContent(html);
      
      const pdfPath = join(this.pdfDir, `pedido-${pedidoData.id}-${timestamp}.pdf`);
      this.logger.log(`Gerando PDF em: ${pdfPath}`);
      
      // Garantir que o diretório existe
      await mkdir(this.pdfDir, { recursive: true });
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        }
      });
      
      this.logger.log(`PDF gerado com sucesso para pedido ${pedidoData.id}-${timestamp}`);
      
      // Retorna o caminho relativo para salvar no banco
      return `uploads/pdfs/pedido-${pedidoData.id}-${timestamp}.pdf`;
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF para pedido ${pedidoData?.id}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
