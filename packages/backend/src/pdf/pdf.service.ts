import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SupabaseService } from '../supabase/supabase.service';

// Tipagem para retorno de PDF
interface PdfResult {
  path: string;
  url: string;
}

@Injectable()
export class PdfService implements OnModuleInit {
  private readonly logger = new Logger(PdfService.name);
  private readonly pdfDir: string;
  private readonly logoPath: string;
  private readonly isTest = process.env.NODE_ENV === 'test';
  private readonly useSupabase: boolean;

  constructor(private readonly supabaseService: SupabaseService) {
    // Usar variáveis de ambiente para os caminhos ou fallback para os valores padrão
    const pdfStoragePath = process.env.PDF_STORAGE_PATH || join(process.cwd(), 'uploads', 'pdfs');
    const uploadsPath = process.env.UPLOADS_PATH || join(process.cwd(), 'uploads');

    this.pdfDir = pdfStoragePath;
    this.logoPath = join(uploadsPath, 'static', 'logo.png');
    
    // Verificar se devemos usar o Supabase (baseado na configuração de variáveis de ambiente)
    this.useSupabase = this.supabaseService.isAvailable();
    
    if (this.useSupabase) {
      this.logger.log('Usando Supabase Storage para armazenamento de PDFs');
    } else {
      this.logger.log('Usando armazenamento local para PDFs');
    }
  }

  async onModuleInit() {
    // Se não estiver usando Supabase, garantir que os diretórios locais existam
    if (!this.useSupabase) {
      try {
        await mkdir(this.pdfDir, { recursive: true });
        await mkdir(join(this.pdfDir, '..', 'static'), { recursive: true });
        this.logger.log(`Diretórios inicializados: ${this.pdfDir}`);
      } catch (error) {
        this.logger.error(`Erro ao criar diretórios: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    this.logger.log(`Logo path: ${this.logoPath}`);
    
    // Verificar se a logo existe
    if (existsSync(this.logoPath)) {
      this.logger.log(`Logo encontrada em: ${this.logoPath}`);
    } else {
      this.logger.warn(`Logo não encontrada em: ${this.logoPath}`);
    }
  }

  /**
   * Gera o PDF de um pedido e armazena no Supabase Storage ou localmente
   * @param pedidoData Dados do pedido
   * @returns Se usar Supabase: {path: string, url: string}, caso contrário: string (caminho)
   */
  async generatePedidoPdf(pedidoData: any): Promise<PdfResult | string> {
    let browser;
    try {
      this.logger.log(`Iniciando geração de PDF para pedido ${pedidoData.id}`);
      
      // Validar dados do pedido
      if (!pedidoData || !pedidoData.cliente || !pedidoData.itensPedido) {
        throw new InternalServerErrorException('Dados do pedido inválidos ou incompletos');
      }

      // Em ambiente de teste, gerar um PDF simples
      if (this.isTest) {
        if (this.useSupabase) {
          // Mock para testes com Supabase
          return {
            path: `pedidos/pedido-${pedidoData.id}.pdf`,
            url: `https://example.com/pedido-${pedidoData.id}.pdf`
          };
        } else {
          // Mock para testes com armazenamento local (comportamento original)
          const pdfPath = join(this.pdfDir, `pedido-${pedidoData.id}.pdf`);
          await mkdir(this.pdfDir, { recursive: true });
          
          // Criar um PDF vazio
          const emptyPDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf-8');
          writeFileSync(pdfPath, emptyPDF);
          
          // Retornar caminho relativo compatível com onde o serviço web espera
          const relativePath = pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
          return relativePath;
        }
      }
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Carregar a logo como base64
      let logoBase64 = '';
      try {
        const logoBuffer = readFileSync(this.logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        this.logger.log(`Logo carregada com sucesso de: ${this.logoPath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(`Erro ao carregar logo: ${errorMessage}`);
      }

      // Gerar timestamp único para evitar cache do PDF
      const timestamp = Date.now();
      
      // Gerar HTML do pedido
      const html = this.generatePedidoHTML(pedidoData, logoBase64);

      await page.setContent(html);
      
      // Nome do arquivo
      const filename = `pedido-${pedidoData.id}-${timestamp}.pdf`;
      
      if (this.useSupabase) {
        // === OPÇÃO SUPABASE: GERAR PDF E FAZER UPLOAD PARA SUPABASE ===
        this.logger.log(`Gerando PDF para upload no Supabase: ${filename}`);
        
        try {
          // Gerar o PDF como buffer (em memória)
          const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px',
            },
            printBackground: true
          });
          
          // NOVO: Sempre salvar uma cópia local para garantir que o arquivo existe
          // independentemente do sucesso do upload para o Supabase
          const pdfPath = join(this.pdfDir, filename);
          try {
            // Garantir que o diretório existe
            await mkdir(this.pdfDir, { recursive: true });
            
            // Escrever o buffer para o arquivo
            writeFileSync(pdfPath, pdfBuffer);
            this.logger.log(`Cópia de segurança do PDF salva localmente em: ${pdfPath}`);
          } catch (localSaveError) {
            this.logger.error(`Erro ao salvar cópia local do PDF: ${localSaveError instanceof Error ? localSaveError.message : 'Erro desconhecido'}`);
            // Continuar mesmo se falhar o salvamento local
          }
          
          // Caminho no Supabase Storage
          const supabasePath = `pedidos/${filename}`;
          
          // Fazer upload para o Supabase
          const pdfUrl = await this.supabaseService.uploadFile(
            supabasePath,
            pdfBuffer,
            'application/pdf'
          );
          
          this.logger.log(`PDF enviado para o Supabase: ${pdfUrl}`);
          
          // Retornar caminho e URL
          return {
            path: supabasePath,
            url: pdfUrl
          };
        } catch (error) {
          this.logger.error(`Erro ao gerar/enviar PDF para Supabase: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          
          // NOVO: Em caso de erro, tentar fallback para salvamento local
          try {
            // Gerar nome do arquivo local
            const pdfPath = join(this.pdfDir, filename);
            this.logger.log(`Tentando fallback local para: ${pdfPath}`);
            
            // Garantir que o diretório existe
            await mkdir(this.pdfDir, { recursive: true });
            
            // Gerar PDF diretamente para o arquivo
            await page.pdf({
              path: pdfPath,
              format: 'A4',
              margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px',
              },
              printBackground: true
            });
            
            // Gerar URL local para o PDF
            const relativePath = pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
            const localUrl = `http://localhost:${process.env.PORT || 3001}/${relativePath}`;
            
            this.logger.log(`Fallback para PDF local concluído: ${localUrl}`);
            
            // Retornar informações do PDF local
            return {
              path: relativePath,
              url: localUrl
            };
          } catch (fallbackError) {
            this.logger.error(`Fallback local também falhou: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
            throw new InternalServerErrorException(`Falha ao processar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      } else {
        // === OPÇÃO LOCAL: SALVAR PDF LOCALMENTE (comportamento original) ===
        const pdfPath = join(this.pdfDir, filename);
        this.logger.log(`Gerando PDF em: ${pdfPath}`);
        
        try {
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
          
          // Retornar caminho relativo (comportamento original)
          return pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
        } catch (error) {
          this.logger.error(`Erro ao gerar PDF local: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          throw new InternalServerErrorException(`Falha ao processar PDF localmente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao gerar PDF para pedido ${pedidoData?.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error instanceof Error ? error.stack : undefined
      );
      
      // Re-lançar o erro se já for um InternalServerErrorException, ou criar um novo
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(`Falha ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          this.logger.warn(`Erro ao fechar navegador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }
  }

  /**
   * Gera o HTML para o PDF do pedido
   * @param pedidoData Dados do pedido
   * @param logoBase64 Logo em formato base64
   * @returns HTML do pedido
   */
  private generatePedidoHTML(pedidoData: any, logoBase64: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido #${pedidoData.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
              font-size: 14px;
            }
            .container {
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #8B5A2B;
            }
            .header-left {
              display: flex;
              align-items: center;
            }
            .logo {
              max-width: 80px;
              margin-right: 20px;
            }
            .pedido-info {
              text-align: right;
            }
            .titulo-pedido {
              color: #8B5A2B;
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            h3 {
              color: #8B5A2B;
              margin: 30px 0 10px 0;
              padding: 0 0 10px 0;
              font-size: 18px;
              border-bottom: 1px solid #e0e0e0;
            }
            .card {
              background-color: #f8f5f1;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0 30px 0;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .card p {
              margin: 8px 0;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0 20px 0;
            }
            .data-table {
              border-collapse: separate;
              border-spacing: 1px;
              margin-bottom: 30px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e0e0e0;
            }
            th {
              background-color: #f8f5f1;
              font-weight: bold;
              color: #8B5A2B;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            tr:hover {
              background-color: #f1f1f1;
            }
            .total {
              text-align: right;
              font-weight: bold;
              margin-top: 20px;
              font-size: 18px;
              color: #8B5A2B;
              padding: 15px;
              background-color: #f8f5f1;
              border-radius: 8px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #777;
              border-top: 1px solid #e0e0e0;
              padding-top: 20px;
            }
            .chip {
              display: inline-block;
              padding: 5px 10px;
              border-radius: 16px;
              font-size: 12px;
              font-weight: bold;
            }
            .chip-success {
              background-color: #e6f4ea;
              color: #2e7d32;
            }
            .chip-error {
              background-color: #fdedee;
              color: #d32f2f;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Cabeçalho -->
            <div class="header">
              <div class="header-left">
                ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo">` : ''}
                <div class="company-info">
                  <h2 style="margin: 0; color: #8B5A2B;">Lino's Panificadora</h2>
                  <p style="margin: 5px 0 0; color: #777;">Qualidade e Tradição</p>
                </div>
              </div>
              <div class="pedido-info">
                <h2 class="titulo-pedido">Pedido #${pedidoData.id}</h2>
                <p style="margin: 5px 0; color: #555;">
                  Data: ${new Date(pedidoData.data_pedido).toLocaleDateString('pt-BR')}
                </p>
                <div class="chip ${pedidoData.status === 'ATIVO' ? 'chip-success' : 'chip-error'}">
                  ${pedidoData.status}
                </div>
              </div>
            </div>

            <!-- Dados de Contato -->
            <h3>Dados de Contato</h3>
            <table class="data-table" style="margin-top: 10px;">
              <tr>
                <td style="width: 50%; padding: 12px 15px; background-color: #f8f5f1; border-radius: 8px 0 0 0;"><strong>Empresa:</strong> ${pedidoData.cliente.razao_social}</td>
                <td style="width: 50%; padding: 12px 15px; background-color: #f8f5f1; border-radius: 0 8px 0 0;"><strong>Telefone:</strong> ${pedidoData.cliente.telefone}</td>
              </tr>
              <tr>
                <td style="width: 50%; padding: 12px 15px; background-color: #f8f5f1; border-radius: 0 0 0 8px; border-top: 1px solid #f1f1f1;"><strong>CNPJ:</strong> ${pedidoData.cliente.cnpj}</td>
                <td style="width: 50%; padding: 12px 15px; background-color: #f8f5f1; border-radius: 0 0 8px 0; border-top: 1px solid #f1f1f1;"><strong>Email:</strong> ${pedidoData.cliente.email}</td>
              </tr>
            </table>

            <!-- Itens do Pedido -->
            <h3>Itens do Pedido</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%">Produto</th>
                  <th style="width: 20%">Quantidade</th>
                  <th style="width: 20%">Preço Unit.</th>
                  <th style="width: 20%">Total</th>
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

            <div class="footer">
              <p>Lino's Panificadora - Qualidade e Tradição</p>
              <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Gera um relatório em PDF
   * @param reportData Dados do relatório 
   * @param clienteData Dados do cliente (opcional)
   * @returns Caminho do arquivo gerado
   */
  async generateReportPdf(reportData: any, clienteData?: any): Promise<string> {
    let browser;
    try {
      this.logger.log('Iniciando geração de PDF para relatório');
      
      // Em ambiente de teste, gerar um PDF simples
      if (this.isTest) {
        const timestamp = Date.now();
        const pdfPath = join(this.pdfDir, `relatorio-${timestamp}.pdf`);
        await mkdir(this.pdfDir, { recursive: true });
        
        // Criar um PDF vazio
        const emptyPDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf-8');
        writeFileSync(pdfPath, emptyPDF);
        
        // Retornar caminho relativo
        return pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
      }
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox'] 
      });
      
      const page = await browser.newPage();
      
      // Carregar a logo como base64
      let logoBase64 = '';
      try {
        const logoBuffer = readFileSync(this.logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch (error) {
        this.logger.error(`Erro ao carregar logo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      // Formatação de datas
      const dataInicio = reportData.dataInicio ? format(new Date(reportData.dataInicio), 'dd/MM/yyyy', { locale: ptBR }) : '';
      const dataFim = reportData.dataFim ? format(new Date(reportData.dataFim), 'dd/MM/yyyy', { locale: ptBR }) : '';
      
      // Gerar HTML do relatório
      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container {
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 2px solid #8B5A2B;
            }
            .header-left {
              display: flex;
              align-items: center;
            }
            .logo {
              max-width: 80px;
              margin-right: 20px;
            }
            .header-right {
              text-align: right;
            }
            h1, h2, h3 {
              color: #8B5A2B;
            }
            h3 {
              margin-top: 30px;
              padding-bottom: 5px;
              border-bottom: 1px solid #e0e0e0;
            }
            .periodo {
              background-color: #f8f5f1;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #e0e0e0;
            }
            th {
              background-color: #f8f5f1;
              font-weight: bold;
              color: #8B5A2B;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #777;
              border-top: 1px solid #e0e0e0;
              padding-top: 20px;
            }
            .total {
              text-align: right;
              font-weight: bold;
              margin-top: 20px;
              font-size: 16px;
              color: #8B5A2B;
            }
            .card {
              background-color: #f8f5f1;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-item {
              background-color: #f8f5f1;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #8B5A2B;
              margin: 10px 0;
            }
            .summary-label {
              font-size: 14px;
              color: #555;
            }
            .chart-container {
              margin: 20px 0;
              height: 300px;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Cabeçalho -->
            <div class="header">
              <div class="header-left">
                ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo">` : ''}
                <div>
                  <h1 style="margin: 0;">Lino's Panificadora</h1>
                  <p style="margin: 5px 0 0; color: #777;">Qualidade e Tradição</p>
                </div>
              </div>
              <div class="header-right">
                <h2>${reportData.titulo || 'Relatório'}</h2>
                <p>Gerado em: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</p>
              </div>
            </div>

            <!-- Período -->
            <div class="periodo">
              <h3 style="margin-top: 0;">Período do Relatório</h3>
              <p><strong>Data Início:</strong> ${dataInicio || 'N/A'}</p>
              <p><strong>Data Fim:</strong> ${dataFim || 'N/A'}</p>
              ${clienteData ? `<p><strong>Cliente:</strong> ${clienteData.razao_social} (${clienteData.nome_fantasia})</p>` : ''}
            </div>

            <!-- Resumo -->
            <h3>Resumo</h3>
            <div class="summary-grid">
              ${reportData.resumo ? Object.entries(reportData.resumo).map(([key, value]) => `
                <div class="summary-item">
                  <div class="summary-value">${typeof value === 'number' ? value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : value}</div>
                  <div class="summary-label">${key}</div>
                </div>
              `).join('') : ''}
            </div>

            <!-- Dados Detalhados -->
            ${reportData.detalhes ? `
              <h3>Dados Detalhados</h3>
              <table>
                <thead>
                  <tr>
                    ${reportData.colunas ? reportData.colunas.map(col => `<th>${col}</th>`).join('') : ''}
                  </tr>
                </thead>
                <tbody>
                  ${reportData.detalhes.map(item => `
                    <tr>
                      ${Object.values(item).map(val => `<td>${val}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <!-- Observações -->
            ${reportData.observacoes ? `
              <h3>Observações</h3>
              <div class="card">
                <p>${reportData.observacoes}</p>
              </div>
            ` : ''}

            <!-- Total -->
            ${reportData.total ? `
              <div class="total">
                <p>Total: R$ ${reportData.total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p>Lino's Panificadora - Qualidade e Tradição</p>
              <p>CNPJ: 00.000.000/0000-00</p>
              <p>Documento gerado automaticamente em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          </div>
        </body>
      </html>
      `;

      await page.setContent(html);
      
      const timestamp = Date.now();
      const filename = `relatorio-${reportData.tipo || 'geral'}-${timestamp}.pdf`;
      const pdfPath = join(this.pdfDir, filename);
      
      // Garantir que o diretório existe
      await mkdir(this.pdfDir, { recursive: true });
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        }
      });
      
      this.logger.log(`Relatório PDF gerado com sucesso: ${pdfPath}`);
      
      // Retornar o caminho relativo
      return pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF do relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw new InternalServerErrorException(`Falha ao gerar PDF do relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          this.logger.warn(`Erro ao fechar navegador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }
  }
}