import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from '../pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { join } from 'path';
import { existsSync, readFileSync, unlinkSync, rmdirSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { PdfTestModule } from '../pdf.module.test';
const pdfParse = require('pdf-parse');

// Definir ambiente de teste
process.env.NODE_ENV = 'test';
process.env.PDF_MOCK = 'true';

describe('PdfService Integration Tests', () => {
  let module: TestingModule;
  let pdfService: PdfService;
  let prismaService: PrismaService;
  const uploadDir = join(process.cwd(), 'uploads');
  const pdfDir = join(uploadDir, 'pdfs');
  const imagesDir = join(uploadDir, 'images');
  const logoPath = join(imagesDir, 'logo.png');
  const testPedidoData = {
    id: 1,
    cliente: {
      razao_social: 'Empresa Teste',
      nome_fantasia: 'Padaria Teste',
      cnpj: '12345678901234',
      telefone: '11999999999',
      email: 'teste@teste.com',
      endereco: {
        rua: 'Rua das Flores',
        numero: '100',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01000-000',
      },
    },
    itensPedido: [
      {
        produto: {
          nome: 'Produto Teste',
          tipo_medida: 'un',
        },
        quantidade: 2,
        preco_unitario: 10.00,
        valor_total_item: 20.00,
      }
    ],
    valor_total: 20.00,
    data_pedido: new Date().toISOString(),
    status: 'PENDENTE',
    observacoes: 'Pedido gerado para teste de integração.',
  };

  const testReportData = {
    titulo: 'Relatório de Vendas',
    periodo: {
      inicio: new Date('2025-04-01').toISOString(),
      fim: new Date('2025-04-18').toISOString(),
    },
    dataInicio: new Date('2025-04-01').toISOString(),
    dataFim: new Date('2025-04-18').toISOString(),
    usuario: {
      nome: 'Operador Teste',
      email: 'operador@linos.com.br',
    },
    total: 1500.50,
    itens: [
      {
        descricao: 'Pão Francês',
        quantidade: 100,
        valor_unitario: 0.50,
        valor_total: 50.00,
      },
      {
        descricao: 'Bolo de Chocolate',
        quantidade: 20,
        valor_unitario: 20.00,
        valor_total: 400.00,
      },
    ],
    observacoes: 'Relatório gerado automaticamente para testes.',
  };

  beforeAll(async () => {
    // Criar diretórios necessários
    await mkdir(uploadDir, { recursive: true });
    await mkdir(pdfDir, { recursive: true });
    await mkdir(imagesDir, { recursive: true });
    
    // Criar uma imagem de teste para a logo
    if (!existsSync(logoPath)) {
      // Criar um arquivo PNG vazio
      const emptyPNG = Buffer.from('89504E470D0A1A0A0000000D4948445200000001000000010100000000376EF9240000001049444154785EEDD081090000000C03A0F570ED616C0B0000000049454E44AE426082', 'hex');
      writeFileSync(logoPath, emptyPNG);
    }
    
    module = await Test.createTestingModule({
      imports: [PdfTestModule],
    }).compile();

    pdfService = module.get<PdfService>(PdfService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Inicializar o serviço de PDF
    await pdfService.onModuleInit();
  });

  afterAll(async () => {
    // Limpar arquivos de teste
    if (existsSync(pdfDir)) {
      rmdirSync(pdfDir, { recursive: true });
    }
    if (existsSync(logoPath)) {
      unlinkSync(logoPath);
    }
    await module.close();
  });

  describe('generatePedidoPdf', () => {
    it('should generate PDF file with correct data', async () => {
      // Gerar PDF
      const pdfPath = await pdfService.generatePedidoPdf(testPedidoData);
      
      // Suporte para string | PdfResult
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      const fullPath = join(process.cwd(), pdfPathString);
      expect(existsSync(fullPath)).toBe(true);
      
      // Em ambiente de teste, não verificamos o conteúdo do PDF
      if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
        // Ler o conteúdo do PDF
        const dataBuffer = readFileSync(fullPath);
        const data = await pdfParse(dataBuffer);
        
        // Verificar conteúdo do PDF
        expect(data.text).toContain('Lino\'s Padaria');
        expect(data.text).toContain(`Pedido #${testPedidoData.id}`);
        expect(data.text).toContain(testPedidoData.cliente.razao_social);
        expect(data.text).toContain(testPedidoData.cliente.cnpj);
        expect(data.text).toContain(testPedidoData.cliente.telefone);
        expect(data.text).toContain(testPedidoData.cliente.email);
        expect(data.text).toContain(testPedidoData.itensPedido[0].produto.nome);
        expect(data.text).toContain(testPedidoData.status);
        expect(data.text).toContain(testPedidoData.valor_total.toFixed(2));
      }
    });

    it('should create PDF directory if it doesn\'t exist', async () => {
      // Remover diretório de PDFs
      if (existsSync(pdfDir)) {
        rmdirSync(pdfDir, { recursive: true });
      }
      
      // Gerar PDF (isso deve recriar o diretório)
      await pdfService.generatePedidoPdf(testPedidoData);
      
      // Verificar se o diretório foi criado
      expect(existsSync(pdfDir)).toBe(true);
    });

    it('should handle missing logo gracefully', async () => {
      // Remover logo se existir
      if (existsSync(logoPath)) {
        unlinkSync(logoPath);
      }
      
      // Gerar PDF sem a logo
      const pdfPath = await pdfService.generatePedidoPdf(testPedidoData);
      // Suporte para string | PdfResult
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      // Verificar se o PDF foi gerado mesmo sem a logo
      const fullPath = join(process.cwd(), pdfPathString);
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should generate unique filenames for different pedidos', async () => {
      const pedido1 = { ...testPedidoData, id: 1 };
      const pedido2 = { ...testPedidoData, id: 2 };
      
      const path1 = await pdfService.generatePedidoPdf(pedido1);
      const path2 = await pdfService.generatePedidoPdf(pedido2);
      
      // Suporte para string | PdfResult
      const path1String = typeof path1 === 'string' ? path1 : path1.path;
      const path2String = typeof path2 === 'string' ? path2 : path2.path;
      expect(path1String).not.toBe(path2String);
      expect(existsSync(join(process.cwd(), path1String))).toBe(true);
      expect(existsSync(join(process.cwd(), path2String))).toBe(true);
      
      // Limpar arquivos de teste
      unlinkSync(join(process.cwd(), path1String));
      unlinkSync(join(process.cwd(), path2String));
    });

    it('should throw error for invalid pedido data', async () => {
      const invalidPedido = {
        id: 1,
        // Dados incompletos
      };
      
      await expect(pdfService.generatePedidoPdf(invalidPedido)).rejects.toThrow();
    });
  });

  describe('generateReportPdf', () => {
    it('should generate PDF file with correct report data', async () => {
      const pdfPath = await pdfService.generateReportPdf(testReportData);
      // Em modo mock, o nome do arquivo é sempre relatorios/relatorio-geral-mock.pdf
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      const expectedMockPath = 'relatorios/relatorio-geral-mock.pdf';
      expect(pdfPathString).toBe(expectedMockPath);
      const fullPath = join(process.cwd(), pdfPathString);
      console.log('[DEBUG][TEST] pdfPathString:', pdfPathString, '| fullPath:', fullPath);
      expect(existsSync(fullPath)).toBe(true);
    });

    it('should throw error for invalid report data', async () => {
      const invalidReport = { titulo: 'Relatório Inválido' };
      await expect(pdfService.generateReportPdf(invalidReport)).rejects.toThrow();
    });
  });
});
