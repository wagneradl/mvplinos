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
      data: defaultData,
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

      expect(response.body).toEqual(expect.objectContaining({
        id: expect.any(Number),
        ...produto,
      }));
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

    it('should not allow duplicate produto names', async () => {
      // Criar primeiro produto
      await createTestProduto({ nome: 'Produto Teste' });

      // Tentar criar outro produto com mesmo nome
      const response = await request(app.getHttpServer())
        .post('/produtos')
        .send({
          nome: 'Produto Teste',
          preco_unitario: 1.00,
          tipo_medida: 'un',
          status: 'ativo',
        })
        .expect(400);

      expect(response.body.message).toBe('Já existe um produto com este nome');
    });

    it('should validate tipo_medida values', async () => {
      const response = await request(app.getHttpServer())
        .post('/produtos')
        .send({
          nome: 'Produto Teste',
          preco_unitario: 1.00,
          tipo_medida: 'invalid',
          status: 'ativo',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'tipo_medida must be one of the following values: un, kg, lt',
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
          await createTestProduto({
            nome: `Produto ${i}`,
            preco_unitario: i * 1.5,
          })
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
      const response = await request(app.getHttpServer())
        .get('/produtos')
        .expect(200);

      expect(response.body).toEqual({
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
      const produto = await createTestProduto();

      const response = await request(app.getHttpServer())
        .get('/produtos')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(expect.objectContaining({
        id: produto.id,
        nome: produto.nome,
        preco_unitario: produto.preco_unitario,
        tipo_medida: produto.tipo_medida,
        status: produto.status,
      }));
    });

    it('should filter produtos by status', async () => {
      // Criar produtos com status diferentes
      await createTestProduto({ nome: 'Produto Ativo', status: 'ativo' });
      await createTestProduto({ nome: 'Produto Inativo', status: 'inativo' });

      // Buscar produtos ativos
      const responseAtivos = await request(app.getHttpServer())
        .get('/produtos')
        .query({ status: 'ativo' })
        .expect(200);

      expect(responseAtivos.body.data).toHaveLength(1);
      expect(responseAtivos.body.data[0].nome).toBe('Produto Ativo');

      // Buscar produtos inativos
      const responseInativos = await request(app.getHttpServer())
        .get('/produtos')
        .query({ status: 'inativo' })
        .expect(200);

      expect(responseInativos.body.data).toHaveLength(1);
      expect(responseInativos.body.data[0].nome).toBe('Produto Inativo');
    });

    it('should search produtos by name', async () => {
      await createTestProduto({ nome: 'Pão Francês' });
      await createTestProduto({ nome: 'Pão de Forma' });
      await createTestProduto({ nome: 'Bolo de Chocolate' });

      const response = await request(app.getHttpServer())
        .get('/produtos')
        .query({ search: 'Pão' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map(p => p.nome)).toEqual(
        expect.arrayContaining(['Pão Francês', 'Pão de Forma'])
      );
    });

    it('should order produtos by name', async () => {
      await createTestProduto({ nome: 'Produto C' });
      await createTestProduto({ nome: 'Produto A' });
      await createTestProduto({ nome: 'Produto B' });

      const response = await request(app.getHttpServer())
        .get('/produtos')
        .query({ orderBy: 'nome', order: 'asc' })
        .expect(200);

      const nomes = response.body.data.map(p => p.nome);
      expect(nomes).toEqual(['Produto A', 'Produto B', 'Produto C']);
    });

    it('should order produtos by price', async () => {
      await createTestProduto({ nome: 'Produto 1', preco_unitario: 3.00 });
      await createTestProduto({ nome: 'Produto 2', preco_unitario: 1.00 });
      await createTestProduto({ nome: 'Produto 3', preco_unitario: 2.00 });

      const response = await request(app.getHttpServer())
        .get('/produtos')
        .query({ orderBy: 'preco_unitario', order: 'asc' })
        .expect(200);

      const precos = response.body.data.map(p => p.preco_unitario);
      expect(precos).toEqual([1.00, 2.00, 3.00]);
    });
  });

  describe('/produtos/:id (GET)', () => {
    it('should return 404 for non-existent produto', async () => {
      const response = await request(app.getHttpServer())
        .get('/produtos/999')
        .expect(404);

      expect(response.body).toEqual({
        message: 'Produto com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return produto if exists', async () => {
      const produto = await createTestProduto();

      const response = await request(app.getHttpServer())
        .get(`/produtos/${produto.id}`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: produto.id,
        nome: produto.nome,
        preco_unitario: produto.preco_unitario,
        tipo_medida: produto.tipo_medida,
        status: produto.status,
      }));
    });

    it('should return 404 for deleted produto', async () => {
      const produto = await createTestProduto();
      
      // Deletar o produto
      await prismaService.produto.update({
        where: { id: produto.id },
        data: { deleted_at: new Date(), status: 'inativo' }
      });

      const response = await request(app.getHttpServer())
        .get(`/produtos/${produto.id}`)
        .expect(404);

      expect(response.body.message).toBe(`Produto com ID ${produto.id} não encontrado`);
    });
  });

  describe('/produtos/:id (PATCH)', () => {
    it('should update produto', async () => {
      const produto = await createTestProduto();

      const updateData: UpdateProdutoDto = {
        nome: 'Pão de Forma',
        preco_unitario: 5.00,
      };

      const response = await request(app.getHttpServer())
        .patch(`/produtos/${produto.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: produto.id,
        ...updateData,
        tipo_medida: produto.tipo_medida,
        status: produto.status,
      }));
    });

    it('should return 404 for non-existent produto', async () => {
      const updateData = {
        nome: 'Pão de Forma',
      };

      const response = await request(app.getHttpServer())
        .patch('/produtos/999')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        message: 'Produto com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should validate preco_unitario on update', async () => {
      const produto = await createTestProduto();

      const response = await request(app.getHttpServer())
        .patch(`/produtos/${produto.id}`)
        .send({ preco_unitario: -1 })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'preco_unitario must not be less than 0',
        ]),
      );
    });

    it('should not allow update of deleted produto', async () => {
      const produto = await createTestProduto();
      
      // Deletar o produto
      await prismaService.produto.update({
        where: { id: produto.id },
        data: { deleted_at: new Date(), status: 'inativo' }
      });

      const response = await request(app.getHttpServer())
        .patch(`/produtos/${produto.id}`)
        .send({ nome: 'Novo Nome' })
        .expect(404);

      expect(response.body.message).toBe(`Produto com ID ${produto.id} não encontrado`);
    });

    it('should not allow duplicate names on update', async () => {
      const produto1 = await createTestProduto({ nome: 'Produto 1' });
      await createTestProduto({ nome: 'Produto 2' });

      const response = await request(app.getHttpServer())
        .patch(`/produtos/${produto1.id}`)
        .send({ nome: 'Produto 2' })
        .expect(400);

      expect(response.body.message).toBe('Já existe um produto com este nome');
    });
  });

  describe('/produtos/:id (DELETE)', () => {
    it('should soft delete produto', async () => {
      const produto = await createTestProduto();

      await request(app.getHttpServer())
        .delete(`/produtos/${produto.id}`)
        .expect(200);

      const deletedProduto = await prismaService.produto.findUnique({
        where: { id: produto.id },
      });

      expect(deletedProduto.deleted_at).not.toBeNull();
      expect(deletedProduto.status).toBe('inativo');
    });

    it('should return 404 for non-existent produto', async () => {
      const response = await request(app.getHttpServer())
        .delete('/produtos/999')
        .expect(404);

      expect(response.body).toEqual({
        message: 'Produto com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return 404 for already deleted produto', async () => {
      const produto = await createTestProduto();
      
      // Deletar o produto
      await prismaService.produto.update({
        where: { id: produto.id },
        data: { deleted_at: new Date(), status: 'inativo' }
      });

      const response = await request(app.getHttpServer())
        .delete(`/produtos/${produto.id}`)
        .expect(404);

      expect(response.body.message).toBe(`Produto com ID ${produto.id} não encontrado`);
    });

    it('should not allow deletion of produto in use', async () => {
      // Criar produto e pedido usando o produto
      const produto = await createTestProduto();
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          email: 'teste@teste.com',
          telefone: '11999999999',
          status: 'ativo'
        }
      });

      await prismaService.pedido.create({
        data: {
          cliente: { connect: { id: cliente.id } },
          data_pedido: new Date(),
          valor_total: 10.00,
          status: 'pendente',
          pdf_path: 'test.pdf',
          itensPedido: {
            create: {
              produto: { connect: { id: produto.id } },
              quantidade: 1,
              preco_unitario: 10.00,
              valor_total_item: 10.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .delete(`/produtos/${produto.id}`)
        .expect(400);

      expect(response.body.message).toBe('Não é possível excluir um produto que está sendo usado em pedidos');
    });
  });
});
