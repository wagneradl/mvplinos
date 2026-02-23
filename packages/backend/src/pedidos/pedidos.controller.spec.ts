import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { SupabaseService } from '../supabase/supabase.service';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

describe('PedidosController', () => {
  let controller: PedidosController;

  const mockPedidoResponse = {
    id: 1,
    cliente_id: 1,
    valor_total: 150.0,
    status: 'ATIVO',
    pdf_path: '/uploads/pdfs/pedido-1.pdf',
    pdf_url: null,
    observacoes: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
    cliente: { id: 1, razao_social: 'Padaria Central' },
    itens: [{ id: 1, produto_id: 1, quantidade: 10, preco_unitario: 15.0 }],
  };

  const mockPedidosService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    repeat: jest.fn(),
    generateReport: jest.fn(),
    generateReportPdf: jest.fn(),
    updateItemQuantidade: jest.fn(),
    regeneratePdf: jest.fn(),
  };

  const mockSupabaseService = {
    isAvailable: jest.fn(),
    getSignedUrl: jest.fn(),
    downloadFile: jest.fn(),
    getBucketName: jest.fn().mockReturnValue('linos-pdfs'),
  };

  const mockResponse = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.sendFile = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosController],
      providers: [
        { provide: PedidosService, useValue: mockPedidosService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    controller = module.get<PedidosController>(PedidosController);
  });

  // =========================================================================
  // CRUD DELEGATION
  // =========================================================================

  describe('create', () => {
    it('deve delegar criação ao service com o DTO recebido', async () => {
      const dto = { cliente_id: 1, itens: [{ produto_id: 1, quantidade: 5 }] };
      mockPedidosService.create.mockResolvedValue(mockPedidoResponse);

      const result = await controller.create(dto as any);

      expect(mockPedidosService.create).toHaveBeenCalledWith(dto);
      expect(result.id).toBe(1);
    });
  });

  describe('findAll', () => {
    it('deve delegar listagem ao service com filtros', async () => {
      const filterDto = { page: 1, limit: 10, status: 'ATIVO' };
      mockPedidosService.findAll.mockResolvedValue({
        data: [mockPedidoResponse],
        total: 1,
      });

      const result = await controller.findAll(filterDto as any);

      expect(mockPedidosService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toHaveProperty('data');
    });

    it('deve passar filtros de data ao service', async () => {
      const filterDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 1,
        limit: 10,
      };
      mockPedidosService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll(filterDto as any);

      expect(mockPedidosService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve delegar busca ao service com ID parseado', async () => {
      mockPedidosService.findOne.mockResolvedValue(mockPedidoResponse);

      const result = await controller.findOne('1');

      expect(mockPedidosService.findOne).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
    });
  });

  describe('update', () => {
    it('deve delegar atualização ao service com ID e DTO', async () => {
      const updateDto = { status: 'CANCELADO' };
      mockPedidosService.update.mockResolvedValue({
        ...mockPedidoResponse,
        status: 'CANCELADO',
      });

      const result = await controller.update('1', updateDto as any);

      expect(mockPedidosService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.status).toBe('CANCELADO');
    });
  });

  describe('remove', () => {
    it('deve delegar remoção ao service com ID parseado', async () => {
      mockPedidosService.remove.mockResolvedValue({
        ...mockPedidoResponse,
        status: 'CANCELADO',
      });

      const result = await controller.remove('1');

      expect(mockPedidosService.remove).toHaveBeenCalledWith(1);
      expect(result.status).toBe('CANCELADO');
    });
  });

  describe('repeat', () => {
    it('deve delegar repetição ao service com ID parseado', async () => {
      mockPedidosService.repeat.mockResolvedValue({
        ...mockPedidoResponse,
        id: 2,
      });

      const result = await controller.repeat('1');

      expect(mockPedidosService.repeat).toHaveBeenCalledWith(1);
      expect(result.id).toBe(2);
    });
  });

  describe('updateItemQuantidade', () => {
    it('deve delegar atualização de item ao service', async () => {
      mockPedidosService.updateItemQuantidade.mockResolvedValue(mockPedidoResponse);

      const result = await controller.updateItemQuantidade(1, 10, 5);

      expect(mockPedidosService.updateItemQuantidade).toHaveBeenCalledWith(1, 10, 5);
      expect(result).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('deve delegar geração de relatório ao service', async () => {
      const reportDto = { data_inicio: '2024-01-01', data_fim: '2024-12-31' };
      const reportResult = { total: 10, valor_total: 1500.0 };
      mockPedidosService.generateReport.mockResolvedValue(reportResult);

      const result = await controller.generateReport(reportDto as any);

      expect(mockPedidosService.generateReport).toHaveBeenCalledWith(reportDto);
      expect(result).toEqual(reportResult);
    });
  });

  // =========================================================================
  // PDF DOWNLOAD (:id/pdf)
  // =========================================================================

  describe('downloadPdf', () => {
    it('deve redirecionar para pdf_url quando é URL completa', async () => {
      const res = mockResponse();
      mockPedidosService.findOne.mockResolvedValue({
        ...mockPedidoResponse,
        pdf_url: 'https://storage.example.com/pedido-1.pdf',
      });
      mockSupabaseService.isAvailable.mockReturnValue(false);

      await controller.downloadPdf(1, res);

      expect(res.redirect).toHaveBeenCalledWith(
        'https://storage.example.com/pedido-1.pdf',
      );
    });

    it('deve baixar PDF do Supabase quando pdf_path é caminho Supabase', async () => {
      const res = mockResponse();
      const mockArrayBuffer = new ArrayBuffer(8);
      mockPedidosService.findOne.mockResolvedValue({
        ...mockPedidoResponse,
        pdf_url: null,
        pdf_path: 'pedidos/pedido-1.pdf',
      });
      mockSupabaseService.isAvailable.mockReturnValue(false);
      mockSupabaseService.downloadFile.mockResolvedValue({
        data: { arrayBuffer: () => Promise.resolve(mockArrayBuffer) },
      });

      await controller.downloadPdf(1, res);

      expect(mockSupabaseService.downloadFile).toHaveBeenCalledWith(
        'pedidos/pedido-1.pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalled();
    });

    it('deve servir arquivo local quando encontrado no disco', async () => {
      const res = mockResponse();
      mockPedidosService.findOne.mockResolvedValue({
        ...mockPedidoResponse,
        pdf_url: null,
        pdf_path: '/uploads/pdfs/pedido-1.pdf',
      });
      mockSupabaseService.isAvailable.mockReturnValue(false);
      // existsSync retorna true para o caminho local
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === '/uploads/pdfs/pedido-1.pdf';
      });

      await controller.downloadPdf(1, res);

      expect(res.sendFile).toHaveBeenCalledWith('/uploads/pdfs/pedido-1.pdf');
    });

    it('deve tentar regenerar PDF quando não encontrado por nenhum método', async () => {
      const res = mockResponse();
      mockPedidosService.findOne.mockResolvedValue({
        ...mockPedidoResponse,
        pdf_url: null,
        pdf_path: null,
      });
      mockSupabaseService.isAvailable.mockReturnValue(false);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      // regeneratePdf retorna caminho local
      mockPedidosService.regeneratePdf.mockResolvedValue('/uploads/pdfs/pedido-1.pdf');
      // Simular que arquivo existeSync retorna true depois de regenerar
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === '/uploads/pdfs/pedido-1.pdf';
      });

      await controller.downloadPdf(1, res);

      expect(mockPedidosService.regeneratePdf).toHaveBeenCalledWith(1);
      expect(res.sendFile).toHaveBeenCalledWith('/uploads/pdfs/pedido-1.pdf');
    });

    it('deve lançar NotFoundException se PDF não existe em nenhuma fonte', async () => {
      const res = mockResponse();
      mockPedidosService.findOne.mockResolvedValue({
        ...mockPedidoResponse,
        pdf_url: null,
        pdf_path: null,
      });
      mockSupabaseService.isAvailable.mockReturnValue(false);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPedidosService.regeneratePdf.mockResolvedValue(null);

      await expect(controller.downloadPdf(1, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar NotFoundException quando pedido não existe', async () => {
      const res = mockResponse();
      mockPedidosService.findOne.mockResolvedValue(null);

      await expect(controller.downloadPdf(1, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerErrorException para erros inesperados', async () => {
      const res = mockResponse();
      mockPedidosService.findOne.mockRejectedValue(new Error('DB connection lost'));

      await expect(controller.downloadPdf(1, res)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // =========================================================================
  // REPORT PDF (reports/pdf)
  // =========================================================================

  describe('generateReportPdf', () => {
    it('deve servir PDF local quando service retorna caminho string', async () => {
      const res = mockResponse();
      mockPedidosService.generateReportPdf.mockResolvedValue('/tmp/report.pdf');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await controller.generateReportPdf('2024-01-01', '2024-12-31', undefined as any, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.sendFile).toHaveBeenCalledWith('/tmp/report.pdf');
    });

    it('deve retornar signed URL quando service retorna objeto Supabase', async () => {
      const res = mockResponse();
      mockPedidosService.generateReportPdf.mockResolvedValue({
        path: 'relatorios/report.pdf',
        url: 'https://storage.example.com/report.pdf',
      });
      mockSupabaseService.getSignedUrl.mockResolvedValue(
        'https://storage.example.com/signed-report.pdf',
      );

      await controller.generateReportPdf('2024-01-01', '2024-12-31', undefined as any, res);

      expect(mockSupabaseService.getSignedUrl).toHaveBeenCalledWith(
        'relatorios/report.pdf',
        300,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://storage.example.com/signed-report.pdf',
        }),
      );
    });

    it('deve lançar BadRequestException se PDF local não existe', async () => {
      const res = mockResponse();
      mockPedidosService.generateReportPdf.mockResolvedValue('/tmp/report.pdf');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // NotFoundException é capturada pelo catch e re-lançada como BadRequestException
      await expect(
        controller.generateReportPdf('2024-01-01', '2024-12-31', undefined as any, res),
      ).rejects.toThrow('Erro ao gerar PDF do relatório');
    });

    it('deve converter InternalServerErrorException em BadRequestException', async () => {
      const res = mockResponse();
      mockPedidosService.generateReportPdf.mockResolvedValue({
        path: 'relatorios/report.pdf',
        url: 'https://storage.example.com/report.pdf',
      });
      mockSupabaseService.getSignedUrl.mockResolvedValue(null);

      // InternalServerErrorException é capturada pelo catch e re-lançada como BadRequestException
      await expect(
        controller.generateReportPdf('2024-01-01', '2024-12-31', undefined as any, res),
      ).rejects.toThrow('Erro ao gerar PDF do relatório');
    });

    it('deve converter erro genérico em BadRequestException', async () => {
      const res = mockResponse();
      mockPedidosService.generateReportPdf.mockRejectedValue(
        new Error('Erro genérico'),
      );

      await expect(
        controller.generateReportPdf('2024-01-01', '2024-12-31', undefined as any, res),
      ).rejects.toThrow('Erro ao gerar PDF do relatório');
    });
  });
});
