import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from '../pdf.service';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { Logger } from '@nestjs/common';

// Mock dos módulos
jest.mock('puppeteer');
jest.mock('fs/promises');
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

describe('PdfService', () => {
  let service: PdfService;
  let puppeteer;
  let mockPage;
  let mockBrowser;

  const mockPedido = {
    id: 1,
    data_pedido: new Date('2025-01-01T10:00:00Z'),
    status: 'PENDENTE',
    valor_total: 20.0,
    cliente: {
      razao_social: 'Cliente Teste LTDA',
      cnpj: '12345678901234',
      telefone: '1234567890',
      email: 'cliente@teste.com',
    },
    itensPedido: [
      {
        produto: {
          nome: 'Produto Teste',
          tipo_medida: 'un',
        },
        quantidade: 2,
        preco_unitario: 10.0,
        valor_total_item: 20.0,
      },
    ],
  };

  beforeEach(async () => {
    // Setup do mock do Puppeteer
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    puppeteer = require('puppeteer');
    puppeteer.launch.mockResolvedValue(mockBrowser);

    // Setup do mock do mkdir
    (mkdir as jest.Mock).mockResolvedValue(undefined);

    // Setup do mock do Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePedidoPdf', () => {
    it('should generate PDF successfully', async () => {
      const result = await service.generatePedidoPdf(mockPedido);

      expect(result).toBe(`uploads/pdfs/pedido-${mockPedido.id}.pdf`);
      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox'],
      });
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalledWith({
        path: expect.stringContaining(`pedido-${mockPedido.id}.pdf`),
        format: 'A4',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should include all required information in the HTML content', async () => {
      await service.generatePedidoPdf(mockPedido);
      
      const htmlContent = mockPage.setContent.mock.calls[0][0];
      
      // Verificar elementos do cabeçalho
      expect(htmlContent).toContain('<div class="header">');
      expect(htmlContent).toContain('Lino\'s Padaria');
      expect(htmlContent).toContain(`Pedido #${mockPedido.id}`);
      
      // Verificar dados do cliente
      expect(htmlContent).toContain('<h3>Dados do Cliente</h3>');
      expect(htmlContent).toContain(mockPedido.cliente.razao_social);
      expect(htmlContent).toContain(mockPedido.cliente.cnpj);
      expect(htmlContent).toContain(mockPedido.cliente.telefone);
      expect(htmlContent).toContain(mockPedido.cliente.email);
      
      // Verificar tabela de itens
      expect(htmlContent).toContain('<h3>Itens do Pedido</h3>');
      expect(htmlContent).toContain('<table>');
      expect(htmlContent).toContain('<th>Produto</th>');
      expect(htmlContent).toContain('<th>Quantidade</th>');
      expect(htmlContent).toContain('<th>Preço Unit.</th>');
      expect(htmlContent).toContain('<th>Total</th>');
      
      // Verificar informações dos itens
      const item = mockPedido.itensPedido[0];
      expect(htmlContent).toContain(item.produto.nome);
      expect(htmlContent).toContain(`${item.quantidade} ${item.produto.tipo_medida}`);
      expect(htmlContent).toContain(`R$ ${item.preco_unitario.toFixed(2)}`);
      expect(htmlContent).toContain(`R$ ${item.valor_total_item.toFixed(2)}`);
      
      // Verificar valor total e informações finais
      expect(htmlContent).toContain(`R$ ${mockPedido.valor_total.toFixed(2)}`);
      expect(htmlContent).toContain(mockPedido.status);
      expect(htmlContent).toContain(new Date(mockPedido.data_pedido).toLocaleString());
    });

    it('should handle browser launch failure', async () => {
      const error = new Error('Browser launch failed');
      puppeteer.launch.mockRejectedValueOnce(error);

      await expect(service.generatePedidoPdf(mockPedido)).rejects.toThrow('Browser launch failed');
    });

    it('should handle page creation failure', async () => {
      const error = new Error('Page creation failed');
      mockBrowser.newPage.mockRejectedValueOnce(error);

      await expect(service.generatePedidoPdf(mockPedido)).rejects.toThrow('Page creation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle setContent failure', async () => {
      const error = new Error('Failed to set content');
      mockPage.setContent.mockRejectedValueOnce(error);

      await expect(service.generatePedidoPdf(mockPedido)).rejects.toThrow('Failed to set content');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle PDF generation failure', async () => {
      const error = new Error('PDF generation failed');
      mockPage.pdf.mockRejectedValueOnce(error);

      await expect(service.generatePedidoPdf(mockPedido)).rejects.toThrow('PDF generation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle invalid pedido data', async () => {
      const invalidPedido = {
        ...mockPedido,
        cliente: null,
      };

      await expect(service.generatePedidoPdf(invalidPedido)).rejects.toThrow();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should create PDF directory if it does not exist', async () => {
      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/pdfs'),
        { recursive: true },
      );
    });

    it('should log appropriate messages during PDF generation', async () => {
      await service.generatePedidoPdf(mockPedido);

      const logCalls = (Logger.prototype.log as jest.Mock).mock.calls.map(call => call[0]);
      
      expect(logCalls).toEqual(
        expect.arrayContaining([
          `Iniciando geração de PDF para pedido ${mockPedido.id}`,
          expect.stringMatching(/Usando logo de:/),
          expect.stringMatching(/Gerando PDF em:/),
          `PDF gerado com sucesso para pedido ${mockPedido.id}`,
        ])
      );
    });
  });
});
