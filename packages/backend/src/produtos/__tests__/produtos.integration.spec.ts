import request from 'supertest';
import { app, prismaService } from '../../../test/setup-integration';
import { CreateProdutoDto } from '../dto/create-produto.dto';
import { UpdateProdutoDto } from '../dto/update-produto.dto';

describe('Produtos Integration Tests', () => {

  const createTestProduto = async (data: Partial<CreateProdutoDto> = {}) => {
    const defaultData: CreateProdutoDto = {
      nome: 'Pão Francês',
      preco_unitario: 0.50,
      tipo_medida: 'un',
      status: 'ativo',
      ...data
    };

    return await prismaService.produto.create({
      data: {
        ...defaultData,
        deleted_at: null
      },
    });
  };

  describe('/produtos (POST)', () => {
    it('should create produto', async () => {
      const produto = {
        nome: 'Pão Francês',
        preco_unitario: 0.50,
        tipo_medida: 'un',
        status: 'ativo',
      };

      const response = await request(app.getHttpServer())
        .post('/produtos')
        .send(produto)
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(Number),
        ...produto,
        deleted_at: null,
      });
    });

    it('should validate required fields', async () => {
      const produto = {
        nome: '',
        preco_unitario: -1,
        tipo_medida: '',
        status: 'invalid',
      };

      const response = await request(app.getHttpServer())
        .post('/produtos')
        .send(produto)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'nome should not be empty',
          'preco_unitario must not be less than 0',
          'tipo_medida should not be empty',
          'status must be one of the following values: ativo, inativo',
        ]),
      );
    });
  });

  describe('/produtos (GET)', () => {
    it('should return paginated produtos', async () => {
      // Create 15 products
      const products = [];
      for (let i = 1; i <= 15; i++) {
        products.push(
          await prismaService.produto.create({
            data: {
              nome: `Produto ${i}`,
              preco_unitario: i * 1.5,
              tipo_medida: 'un',
              status: 'ativo',
            },
          }),
        );
      }

      // Test first page
      const response1 = await request(app.getHttpServer())
        .get('/produtos')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response1.body.data).toHaveLength(10);
      expect(response1.body.meta).toEqual({
        page: 1,
        limit: 10,
        itemCount: 15,
        pageCount: 2,
        hasPreviousPage: false,
        hasNextPage: true,
      });

      // Test second page
      const response2 = await request(app.getHttpServer())
        .get('/produtos')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response2.body.data).toHaveLength(5);
      expect(response2.body.meta).toEqual({
        page: 2,
        limit: 10,
        itemCount: 15,
        pageCount: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      });
    });

    it('should return empty array when no produtos', async () => {
      return request(app.getHttpServer())
        .get('/produtos')
        .expect(200)
        .expect({
          data: [],
          meta: {
            page: 1,
            limit: 10,
            itemCount: 0,
            pageCount: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        });
    });

    it('should return array of produtos', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });

      return request(app.getHttpServer())
        .get('/produtos')
        .expect(200)
        .expect(res => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].id).toBe(produto.id);
          expect(res.body.data[0].nome).toBe(produto.nome);
          expect(res.body.data[0].preco_unitario).toBe(produto.preco_unitario);
          expect(res.body.data[0].tipo_medida).toBe(produto.tipo_medida);
          expect(res.body.data[0].status).toBe(produto.status);
        });
    });
  });

  describe('/produtos/:id (GET)', () => {
    it('should return 404 for non-existent produto', async () => {
      return request(app.getHttpServer())
        .get('/produtos/999')
        .expect(404)
        .expect({
          message: 'Produto com ID 999 não encontrado',
          error: 'Not Found',
          statusCode: 404,
        });
    });

    it('should return produto if exists', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });

      return request(app.getHttpServer())
        .get(`/produtos/${produto.id}`)
        .expect(200)
        .expect(produto);
    });
  });

  describe('/produtos/:id (PATCH)', () => {
    it('should update produto', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });

      const updateData = {
        nome: 'Pão Francês Atualizado',
        preco_unitario: 0.75,
      };

      return request(app.getHttpServer())
        .patch(`/produtos/${produto.id}`)
        .send(updateData)
        .expect(200)
        .expect({
          ...produto,
          ...updateData,
        });
    });
  });

  describe('/produtos/:id (DELETE)', () => {
    it('should soft delete produto', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/produtos/${produto.id}`)
        .expect(200);

      const deletedProduto = await prismaService.produto.findUnique({
        where: { id: produto.id },
      });

      expect(deletedProduto.deleted_at).not.toBeNull();
    });

    it('should not list soft deleted produtos', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/produtos/${produto.id}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/produtos')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should not find soft deleted produto by id', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Pão Francês',
          preco_unitario: 0.50,
          tipo_medida: 'un',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/produtos/${produto.id}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/produtos/${produto.id}`)
        .expect(404)
        .expect({
          message: `Produto com ID ${produto.id} não encontrado`,
          error: 'Not Found',
          statusCode: 404,
        });
    });

    it('should return 404 for non-existent produto', async () => {
      return request(app.getHttpServer())
        .delete('/produtos/999')
        .expect(404)
        .expect({
          message: 'Produto com ID 999 não encontrado',
          error: 'Not Found',
          statusCode: 404,
        });
    });
  });
});
