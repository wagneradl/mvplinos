import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from '../pdf.service';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { existsSync, writeFileSync } from 'fs';

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(null),
      pdf: jest.fn().mockResolvedValue(null),
    }),
    close: jest.fn().mockResolvedValue(null),
  }),
}));

describe('PdfService', () => {
  let service: PdfService;
  const testPdfDir = join(process.cwd(), 'uploads', 'pdfs');
  const testLogoPath = join(__dirname, '..', '..', 'assets', 'images', 'logo.png');

  beforeEach(async () => {
    // Criar diretório de teste e logo mock
    await mkdir(testPdfDir, { recursive: true });
    await mkdir(join(__dirname, '..', '..', 'assets', 'images'), { recursive: true });
    writeFileSync(testLogoPath, Buffer.from('fake logo'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    // Limpar arquivos de teste
    if (existsSync(testPdfDir)) {
      await rm(testPdfDir, { recursive: true, force: true });
    }
    if (existsSync(testLogoPath)) {
      await rm(testLogoPath);
    }
  });

  describe('onModuleInit', () => {
    it('should create necessary directories', async () => {
      expect(existsSync(testPdfDir)).toBeTruthy();
    });
  });

  describe('generatePedidoPdf', () => {
    const mockPedidoData = {
      id: 1,
      cliente: {
        razao_social: 'Empresa Teste',
        nome_fantasia: 'Teste',
        cnpj: '12345678901234',
        telefone: '11999999999',
        email: 'teste@empresa.com',
      },
      itensPedido: [
        {
          produto: {
            nome: 'Produto Teste',
            tipo_medida: 'un',
          },
          quantidade: 2,
          preco_unitario: 100,
          valor_total_item: 200,
        },
      ],
      valor_total: 200,
      data_pedido: new Date(),
      status: 'PENDENTE',
    };

    it('should generate a PDF file in test environment', async () => {
      process.env.NODE_ENV = 'test';
      const pdfPath = await service.generatePedidoPdf(mockPedidoData);
      // Suporte para string | PdfResult
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      expect(pdfPathString).toBe(`uploads/pdfs/pedido-${mockPedidoData.id}.pdf`);
      expect(existsSync(join(process.cwd(), pdfPathString))).toBeTruthy();
    });

    it('should throw error if pedido data is invalid', async () => {
      const invalidPedidoData = {
        id: 1,
        // Missing required fields
      };

      await expect(service.generatePedidoPdf(invalidPedidoData)).rejects.toThrow(
        'Dados do pedido inválidos ou incompletos'
      );
    });

    it('should generate a PDF file in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const pdfPath = await service.generatePedidoPdf(mockPedidoData);
      // Suporte para string | PdfResult
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      expect(pdfPathString).toMatch(/uploads\/pdfs\/pedido-1-\d+\.pdf/);
    });

    it('should handle missing logo file', async () => {
      process.env.NODE_ENV = 'production';
      if (existsSync(testLogoPath)) {
        await rm(testLogoPath);
      }

      const pdfPath = await service.generatePedidoPdf(mockPedidoData);
      // Suporte para string | PdfResult
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      expect(pdfPathString).toMatch(/uploads\/pdfs\/pedido-1-\d+\.pdf/);
    });

    it('should handle puppeteer errors', async () => {
      process.env.NODE_ENV = 'production';
      const puppeteer = require('puppeteer');
      puppeteer.launch.mockRejectedValueOnce(new Error('Puppeteer error'));

      await expect(service.generatePedidoPdf(mockPedidoData)).rejects.toThrow('Puppeteer error');
    });
  });
});
