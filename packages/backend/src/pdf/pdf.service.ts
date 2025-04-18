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
  private readonly useSupabase: boolean;

  private get isMock(): boolean {
    return process.env.PDF_MOCK === 'true';
  }

  constructor(private readonly supabaseService: SupabaseService) {
    // Usar variáveis de ambiente para os caminhos ou fallback para os valores padrão
    const pdfStoragePath = process.env.PDF_STORAGE_PATH || join(process.cwd(), 'uploads', 'pdfs');
    const uploadsPath = process.env.UPLOADS_PATH || join(process.cwd(), 'uploads');

    this.pdfDir = pdfStoragePath;
    this.logoPath = join(uploadsPath, 'static', 'logo.png');
    
    // Sempre usar Supabase, inclusive em ambiente local, se as variáveis estiverem presentes
    this.useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_BUCKET);
    
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

      // Validar dados do pedido (sempre validar, independente do ambiente)
      if (!pedidoData || !pedidoData.cliente || !pedidoData.itensPedido) {
        throw new InternalServerErrorException('Dados do pedido inválidos ou incompletos');
      }

      // Em ambiente de teste, gerar um PDF simples
      if (this.isMock) {
        const pdfPath = join(this.pdfDir, `pedido-${pedidoData.id}.pdf`);
        await mkdir(this.pdfDir, { recursive: true });
        const emptyPDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf-8');
        writeFileSync(pdfPath, emptyPDF);
        const relativePath = pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
        if (this.useSupabase) {
          // Em modo Supabase mock, path deve ser o local real do arquivo
          return {
            path: relativePath,
            url: `https://example.com/pedido-${pedidoData.id}.pdf`
          };
        } else {
          return relativePath;
        }
      }
      
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox'],
      });
      
      const page = await browser.newPage();
      
      // Carregar a logo como base64
      let logoBase64 = '';
      try {
        const logoBuffer = readFileSync(this.logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        this.logger.log(`Logo carregada com sucesso de: ${this.logoPath}`);
        // Logar o início do base64 para debug
        this.logger.log(`Logo base64 start: ${logoBase64.substring(0, 50)}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.error(`Erro ao carregar logo: ${errorMessage}`);
      }

      // Gerar timestamp único para evitar cache do PDF
      const timestamp = Date.now();
      
      // Gerar HTML do pedido
      const html = this.generatePedidoHTML(pedidoData, logoBase64);
      this.logger.log(`[DEBUG] HTML do pedido (início): ${html.substring(0, 500)}`);

      // LOGAR HTML GERADO PARA DEBUG
      console.log(`[DEBUG][PDF] Trecho do HTML enviado ao Puppeteer:`, html?.substring(0, 300));

      await page.setContent(html);
      
      // Nome do arquivo
      const filename = `pedido-${pedidoData.id}-${timestamp}.pdf`;
      
      if (this.useSupabase) {
        // === OPÇÃO SUPABASE: GERAR PDF E FAZER UPLOAD PARA SUPABASE ===
        this.logger.log(`Gerando PDF para upload no Supabase: ${filename}`);
        
        try {
          // Gerar o PDF como buffer (em memória)
          let pdfBuffer: Buffer;
          try {
            pdfBuffer = await page.pdf({
              format: 'A4',
              margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px',
              },
              printBackground: true
            });
            console.log(`[DEBUG][PDF] Buffer gerado para ${filename}: tamanho = ${pdfBuffer.length} bytes`);
          } catch (err) {
            console.error(`[DEBUG][PDF] Erro ao gerar buffer do PDF: ${err instanceof Error ? err.message : err}`);
            throw err;
          }
          // (Opcional) Salvar localmente para inspeção manual
          // writeFileSync(`/tmp/${filename}`, pdfBuffer);
          
          // Caminho no Supabase
          const supabasePath = `pedidos/${filename}`;
          console.log(`[DEBUG][PDF] Enviando para Supabase: ${supabasePath}`);
          
          // === UPLOAD PARA SUPABASE ===
          const pdfUrl = await this.supabaseService.uploadFile(
            supabasePath,
            pdfBuffer,
            'application/pdf'
          );
          console.log(`[DEBUG][PDF] URL retornada pelo Supabase: ${pdfUrl}`);
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
   * @returns Se usar Supabase: {path, url}, caso contrário: string (caminho)
   */
  async generateReportPdf(reportData: any, clienteData?: any): Promise<PdfResult | string> {
    let browser;
    try {
      this.logger.log('Iniciando geração de PDF para relatório');

      // LOG DETALHADO PARA DEBUG DE RELATÓRIO
      console.log('[DEBUG][PDF][RELATORIO] reportData:', JSON.stringify(reportData, null, 2));
      console.log('[DEBUG][PDF][RELATORIO] dataInicioRaw:', reportData.dataInicio || reportData.data_inicio);
      console.log('[DEBUG][PDF][RELATORIO] dataFimRaw:', reportData.dataFim || reportData.data_fim);
      console.log('[DEBUG][PDF][RELATORIO] reportData.titulo:', reportData?.titulo);
      console.log('[DEBUG][PDF][RELATORIO] reportData.itens.length:', Array.isArray(reportData?.itens) ? reportData.itens.length : 'NÃO É ARRAY');

      // Validar dados do relatório (sempre validar, independente do ambiente)
      let dataInicioRaw = reportData.dataInicio || reportData.data_inicio;
      let dataFimRaw = reportData.dataFim || reportData.data_fim;
      if (!dataInicioRaw && reportData.periodo && (reportData.periodo.inicio || reportData.periodo.data_inicio)) {
        dataInicioRaw = reportData.periodo.inicio || reportData.periodo.data_inicio;
      }
      if (!dataFimRaw && reportData.periodo && (reportData.periodo.fim || reportData.periodo.data_fim)) {
        dataFimRaw = reportData.periodo.fim || reportData.periodo.data_fim;
      }
      // Validação: título, datas, itens
      if (!reportData || !reportData.titulo || !dataInicioRaw || !dataFimRaw || !Array.isArray(reportData.itens)) {
        console.error('[ERRO][PDF][RELATORIO] Dados do relatório inválidos:', JSON.stringify(reportData, null, 2));
        throw new InternalServerErrorException('Dados do relatório inválidos ou incompletos');
      }
      if (reportData.itens.length === 0) {
        console.warn('[AVISO][PDF][RELATORIO] Relatório gerado sem itens. Será criado um PDF vazio (sem pedidos no período).');
      }
      this.logger.log(`[DEBUG] dataInicioRaw: ${dataInicioRaw}, dataFimRaw: ${dataFimRaw}`);

      // Em ambiente de teste, gerar um PDF simples
      if (this.isMock) {
        // Usar nome de arquivo estático para relatórios em ambiente de teste
        const relatorioDir = 'relatorios';
        const relatorioFilename = 'relatorio-geral-mock.pdf';
        const pdfPath = join(process.cwd(), relatorioDir, relatorioFilename);
        await mkdir(join(process.cwd(), relatorioDir), { recursive: true });
        const emptyPDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf-8');
        writeFileSync(pdfPath, emptyPDF);
        const relativePath = join(relatorioDir, relatorioFilename);
        console.log('[DEBUG][PdfService] PDF gerado (mock):', pdfPath, '| relative:', relativePath);
        if (this.useSupabase) {
          return {
            path: relativePath,
            url: `https://example.com/${relatorioFilename}`
          };
        } else {
          return relativePath;
        }
      }

      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox'],
      });
      const page = await browser.newPage();

      // Carregar a logo como base64
      let logoBase64 = '';
      try {
        const logoBuffer = readFileSync(this.logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        this.logger.log(`Logo carregada com sucesso de: ${this.logoPath}`);
        this.logger.log(`Logo base64 start: ${logoBase64.substring(0, 50)}`);
      } catch (error) {
        this.logger.error(`Erro ao carregar logo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      // Formatação de datas
      const dataInicio = dataInicioRaw ? format(new Date(dataInicioRaw), 'dd/MM/yyyy', { locale: ptBR }) : '';
      const dataFim = dataFimRaw ? format(new Date(dataFimRaw), 'dd/MM/yyyy', { locale: ptBR }) : '';
      this.logger.log(`[DEBUG] dataInicio formatado: ${dataInicio}, dataFim formatado: ${dataFim}`);

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
              <div class="summary-item">
                <div class="summary-value">${reportData.resumo && typeof reportData.resumo.total_orders === 'number' ? reportData.resumo.total_orders : '-'}</div>
                <div class="summary-label">Pedidos</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${reportData.resumo && typeof reportData.resumo.total_value === 'number' ? reportData.resumo.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</div>
                <div class="summary-label">Valor Total</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${reportData.resumo && typeof reportData.resumo.average_value === 'number' ? reportData.resumo.average_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</div>
                <div class="summary-label">Ticket Médio</div>
              </div>
            </div>

            <!-- Dados Detalhados -->
            ${Array.isArray(reportData.detalhes) && reportData.detalhes.length > 0 ? `
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
                      <td>${item.pedido}</td>
                      <td>${item.data}</td>
                      <td>${typeof item.valor_total === 'number' ? item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : item.valor_total}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="card" style="text-align:center; margin:40px 0;">
                <h2 style="color:#8B5A2B; margin-bottom:12px;">Nenhum pedido encontrado</h2>
                <p>Nenhum pedido foi realizado no período selecionado.</p>
              </div>
            `}

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
                <p>Total: ${reportData.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p>Lino's Panificadora - Qualidade e Tradição</p>
              <p>CNPJ: 47.096.720/0001-66</p>
              <p>Documento gerado automaticamente em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          </div>
        </body>
      </html>
      `;

      // LOGAR HTML GERADO PARA DEBUG
      console.log(`[DEBUG][PDF] Trecho do HTML enviado ao Puppeteer:`, html?.substring(0, 300));
      // SALVAR HTML COMPLETO PARA INSPEÇÃO MANUAL DO RELATÓRIO
      try {
        require('fs').writeFileSync('/tmp/relatorio-teste.html', html);
        console.log('[DEBUG][PDF] HTML do relatório salvo em /tmp/relatorio-teste.html');
      } catch (e) {
        console.error('[DEBUG][PDF] Falha ao salvar HTML do relatório:', e);
      }
      await page.setContent(html);
      const timestamp = Date.now();
      const filename = `relatorio-${reportData.tipo || 'geral'}-${timestamp}.pdf`;

      if (this.useSupabase) {
        this.logger.log(`(DEBUG) [Relatório] Upload Supabase: bucket='${process.env.SUPABASE_BUCKET}', path='${filename}', bufferSize=${html.length}`);
        this.logger.log(`Gerando PDF para upload no Supabase: ${filename}`);
        try {
          // Gerar o PDF como buffer (em memória)
          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px',
            }
          });
          console.log(`[DEBUG] Tamanho do PDF gerado: ${pdfBuffer.length} bytes`);
          // Upload para Supabase
          const uploadPath = `relatorios/${filename}`;
          console.log(`(DEBUG) [Relatório] Upload Supabase: bucket='${process.env.SUPABASE_BUCKET}', path='${uploadPath}', bufferSize=${pdfBuffer.length}`);
          const uploadResp = await this.supabaseService.uploadFile(
            uploadPath,
            pdfBuffer,
            'application/pdf'
          );
          if (uploadResp) {
            console.log(`Relatório PDF enviado para Supabase: ${uploadResp}`);
            return { path: uploadPath, url: uploadResp };
          } else {
            this.logger.error('Erro ao fazer upload do relatório PDF para Supabase.');
            throw new InternalServerErrorException('Erro ao fazer upload do relatório PDF para Supabase.');
          }
        } catch (e) {
          this.logger.error('Erro ao gerar/upload PDF no Supabase:', e instanceof Error ? e.stack || e.message : JSON.stringify(e));
          throw new InternalServerErrorException('Erro ao gerar/upload PDF no Supabase.');
        }
      } else {
        // Modo local: salvar arquivo no disco
        const pdfPath = join(this.pdfDir, filename);
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
        return pdfPath.replace(process.cwd(), '').replace(/^\/+/, '');
      }
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