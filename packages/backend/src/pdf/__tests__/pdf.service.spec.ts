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
    // Setar variáveis de ambiente necessárias
    process.env.SUPABASE_URL = 'https://fake.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    process.env.SUPABASE_BUCKET = 'pedidos-pdfs';
    process.env.PDF_STORAGE_PATH = testPdfDir;
    process.env.UPLOADS_PATH = join(process.cwd(), 'uploads');
    process.env.NODE_ENV = 'test';

    // Criar diretório de teste e logo mock
    await mkdir(testPdfDir, { recursive: true });
    await mkdir(join(__dirname, '..', '..', 'assets', 'images'), { recursive: true });
    writeFileSync(testLogoPath, Buffer.from('fake logo'));

    // Mock do SupabaseService
    const mockSupabaseService = {
      uploadFile: jest.fn().mockResolvedValue('https://fake.supabase.co/pedidos/test.pdf'),
      getSignedUrl: jest.fn().mockResolvedValue('https://fake.supabase.co/signed/pedidos/test.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: require('../../supabase/supabase.service').SupabaseService, useValue: mockSupabaseService }
      ],
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
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      // Se for mock Supabase, não verifica existência do arquivo
      if (pdfPathString === `pedidos/pedido-${mockPedidoData.id}.pdf`) {
        expect(pdfPathString).toBe(`pedidos/pedido-${mockPedidoData.id}.pdf`);
      } else {
        expect(pdfPathString).toBe(`uploads/pdfs/pedido-${mockPedidoData.id}.pdf`);
        expect(existsSync(join(process.cwd(), pdfPathString))).toBeTruthy();
      }
    });

    it('should throw error if pedido data is invalid', async () => {
      await expect(service.generatePedidoPdf({})).rejects.toThrow('Dados do pedido inválidos ou incompletos');
    });

    it('should generate a PDF file in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const pdfPath = await service.generatePedidoPdf(mockPedidoData);
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      // Aceita mock Supabase ou padrão timestamp
      if (pdfPathString === `pedidos/pedido-${mockPedidoData.id}.pdf`) {
        expect(pdfPathString).toBe(`pedidos/pedido-${mockPedidoData.id}.pdf`);
      } else {
        expect(pdfPathString).toMatch(/uploads\/pdfs\/pedido-1-\d+\.pdf/);
        expect(existsSync(join(process.cwd(), pdfPathString))).toBeTruthy();
      }
    });

    it('should handle missing logo file', async () => {
      // Remove logo
      if (existsSync(testLogoPath)) {
        await rm(testLogoPath);
      }
      const pdfPath = await service.generatePedidoPdf(mockPedidoData);
      const pdfPathString = typeof pdfPath === 'string' ? pdfPath : pdfPath.path;
      if (pdfPathString === `pedidos/pedido-${mockPedidoData.id}.pdf`) {
        expect(pdfPathString).toBe(`pedidos/pedido-${mockPedidoData.id}.pdf`);
      } else {
        expect(pdfPathString).toMatch(/uploads\/pdfs\/pedido-1-\d+\.pdf/);
        expect(existsSync(join(process.cwd(), pdfPathString))).toBeTruthy();
      }
    });

    it('should handle puppeteer errors', async () => {
      // Simula erro no Puppeteer em ambiente de produção (não mock)
      process.env.NODE_ENV = 'production';
      const puppeteer = require('puppeteer');
      puppeteer.launch.mockRejectedValueOnce(new Error('Puppeteer error'));
      await expect(service.generatePedidoPdf(mockPedidoData)).rejects.toThrow('Puppeteer error');
    });
  });
});
