import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from '../pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { mkdir } from 'fs/promises';
const pdfParse = require('pdf-parse');

// NÃO ativar o modo mock!
delete process.env.PDF_MOCK;
process.env.NODE_ENV = 'production';

const uploadDir = join(process.cwd(), 'uploads');
const pdfDir = join(uploadDir, 'pdfs');

const testPedidoData = {
  id: 9999,
  cliente: {
    razao_social: 'Empresa Teste PDF Real',
    nome_fantasia: 'Padaria Teste Real',
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
        nome: 'Produto Real',
        tipo_medida: 'un',
      },
      quantidade: 3,
      preco_unitario: 15.00,
      valor_total_item: 45.00,
    }
  ],
  valor_total: 45.00,
  data_pedido: new Date().toISOString(),
  status: 'PAGO',
  observacoes: 'Pedido real para teste de PDF.',
};

describe('PdfService PDF Real Integration Test (Supabase)', () => {
  let module: TestingModule;
  let pdfService: PdfService;
  let pdfUrl: string;

  beforeAll(async () => {
    await mkdir(uploadDir, { recursive: true });
    await mkdir(pdfDir, { recursive: true });
    module = await Test.createTestingModule({
      providers: [PdfService, PrismaService, SupabaseService],
    }).compile();
    pdfService = module.get<PdfService>(PdfService);
    await pdfService.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should generate and upload a real PDF to Supabase, returning a valid URL', async () => {
    const pdfResult = await pdfService.generatePedidoPdf(testPedidoData);
    pdfUrl = typeof pdfResult === 'string' ? pdfResult : pdfResult.url;
    console.log('[TEST] Supabase PDF URL:', pdfUrl);
    expect(pdfUrl).toMatch(/^https:\/\//);
    // (Opcional) Baixar e validar o conteúdo do PDF
    const res = await fetch(pdfUrl);
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000); // PDF real, não vazio
    // Pode adicionar validação de texto do PDF se necessário
  });
});
