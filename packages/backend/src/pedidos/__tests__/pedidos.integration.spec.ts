import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PedidosModule } from '../pedidos.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Pedidos Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PedidosModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Limpar todas as tabelas relacionadas
    await prismaService.itensPedido.deleteMany();
    await prismaService.pedido.deleteMany();
    await prismaService.produto.deleteMany();
    await prismaService.cliente.deleteMany();
  });

  afterAll(async () => {
    await prismaService.itensPedido.deleteMany();
    await prismaService.pedido.deleteMany();
    await prismaService.produto.deleteMany();
    await prismaService.cliente.deleteMany();
    await app.close();
  });

  describe('/pedidos (POST)', () => {
    it('should create pedido', async () => {
      // Criar cliente e produto para o teste
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          telefone: '11999999999',
          email: 'teste@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedidoDto = {
        cliente_id: cliente.id,
        itens: [
          {
            produto_id: produto.id,
            quantidade: 10
          }
        ]
      };

      const response = await request(app.getHttpServer())
        .post('/pedidos')
        .send(pedidoDto)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          cliente_id: cliente.id,
          status: 'PENDENTE',
          valor_total: 5.00, // 10 unidades * 0.50
          data_pedido: expect.any(String),
          deleted_at: null,
          cliente: expect.any(Object),
          itensPedido: expect.arrayContaining([
            expect.objectContaining({
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            })
          ])
        })
      );
    });

    it('should validate required fields', async () => {
      const pedidoDto = {
        cliente_id: null,
        itens: []
      };

      const response = await request(app.getHttpServer())
        .post('/pedidos')
        .send(pedidoDto)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'cliente_id should not be empty',
          'cliente_id must be a number',
          'itens should not be empty'
        ])
      );
    });

    it('should return 404 for non-existent cliente', async () => {
      const pedidoDto = {
        cliente_id: 999,
        itens: [
          {
            produto_id: 1,
            quantidade: 10
          }
        ]
      };

      return request(app.getHttpServer())
        .post('/pedidos')
        .send(pedidoDto)
        .expect(404)
        .expect({
          message: 'Cliente com ID 999 não encontrado',
          error: 'Not Found',
          statusCode: 404
        });
    });
  });

  describe('/pedidos (GET)', () => {
    it('should list pedidos with pagination', async () => {
      // Criar dados de teste
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          telefone: '11999999999',
          email: 'teste@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      await prismaService.pedido.create({
        data: {
          cliente_id: cliente.id,
          data_pedido: new Date(),
          status: 'PENDENTE',
          valor_total: 5.00,
          caminho_pdf: '',
          itensPedido: {
            create: {
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get('/pedidos')
        .expect(200);

      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            cliente_id: cliente.id,
            status: 'PENDENTE',
            valor_total: 5.00
          })
        ]),
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });
  });

  describe('/pedidos/:id (GET)', () => {
    it('should get pedido by id', async () => {
      // Criar dados de teste
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          telefone: '11999999999',
          email: 'teste@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedido = await prismaService.pedido.create({
        data: {
          cliente_id: cliente.id,
          data_pedido: new Date(),
          status: 'PENDENTE',
          valor_total: 5.00,
          caminho_pdf: '',
          itensPedido: {
            create: {
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            }
          }
        },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get(`/pedidos/${pedido.id}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: pedido.id,
          cliente_id: cliente.id,
          status: 'PENDENTE',
          valor_total: 5.00,
          cliente: expect.any(Object),
          itensPedido: expect.arrayContaining([
            expect.objectContaining({
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            })
          ])
        })
      );
    });
  });

  describe('/pedidos/:id (DELETE)', () => {
    it('should soft delete pedido', async () => {
      // Criar dados de teste
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          telefone: '11999999999',
          email: 'teste@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedido = await prismaService.pedido.create({
        data: {
          cliente_id: cliente.id,
          data_pedido: new Date(),
          status: 'PENDENTE',
          valor_total: 5.00,
          caminho_pdf: '',
          itensPedido: {
            create: {
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            }
          }
        }
      });

      await request(app.getHttpServer())
        .delete(`/pedidos/${pedido.id}`)
        .expect(200);

      const deletedPedido = await prismaService.pedido.findUnique({
        where: { id: pedido.id }
      });

      expect(deletedPedido.deleted_at).not.toBeNull();
      expect(deletedPedido.status).toBe('CANCELADO');
    });
  });

  describe('/pedidos/:id/repeat (POST)', () => {
    it('should create new pedido based on existing one', async () => {
      // Criar dados de teste
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          telefone: '11999999999',
          email: 'teste@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedidoOriginal = await prismaService.pedido.create({
        data: {
          cliente_id: cliente.id,
          data_pedido: new Date(),
          status: 'PENDENTE',
          valor_total: 5.00,
          caminho_pdf: '',
          itensPedido: {
            create: {
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .post(`/pedidos/${pedidoOriginal.id}/repeat`)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          cliente_id: cliente.id,
          status: 'PENDENTE',
          valor_total: 5.00,
          itensPedido: expect.arrayContaining([
            expect.objectContaining({
              produto_id: produto.id,
              quantidade: 10,
              preco_unitario: 0.50,
              valor_total_item: 5.00
            })
          ])
        })
      );

      // Verificar se é um novo pedido
      expect(response.body.id).not.toBe(pedidoOriginal.id);
    });
  });
});
