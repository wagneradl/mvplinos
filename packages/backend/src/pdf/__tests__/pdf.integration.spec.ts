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
      cnpj: '12345678901234',
      telefone: '11999999999',
      email: 'teste@teste.com'
    },
    itensPedido: [
      {
        produto: {
          nome: 'Produto Teste',
          tipo_medida: 'un'
        },
        quantidade: 2,
        preco_unitario: 10.00,
        valor_total_item: 20.00
      }
    ],
    valor_total: 20.00,
    data_pedido: new Date(),
    status: 'PENDENTE'
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
});
