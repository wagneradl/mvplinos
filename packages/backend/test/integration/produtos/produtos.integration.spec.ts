import request from 'supertest';
import { CreateProdutoDto } from '../../../src/produtos/dto/create-produto.dto';
import { setupTestApp, TestContext, cleanupDatabase, createTestProduct } from '../../config/test-setup';

describe('ProdutosController (Integration)', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await setupTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase(testContext.prismaService);
  });

  afterAll(async () => {
    await cleanupDatabase(testContext.prismaService);
    await testContext.prismaService.$disconnect();
    await testContext.app.close();
  });

  describe('POST /produtos', () => {
    const createProdutoDto: CreateProdutoDto = {
      nome: 'Produto Teste',
      preco_unitario: 10.50,
      tipo_medida: 'unidade',
      status: 'ativo',
    };

    it('should create product when admin is authenticated', async () => {
      const response = await request(testContext.app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${testContext.adminToken}`)
        .send(createProdutoDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nome).toBe(createProdutoDto.nome);
    });

    it('should not create product when user is not admin', async () => {
      await request(testContext.app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${testContext.userToken}`)
        .send(createProdutoDto)
        .expect(403);
    });

    it('should not create product without authentication', async () => {
      await request(testContext.app.getHttpServer())
        .post('/produtos')
        .send(createProdutoDto)
        .expect(401);
    });
  });

  describe('GET /produtos', () => {
    beforeEach(async () => {
      // Criar produtos para teste usando helper
      await createTestProduct(testContext.prismaService, {
        nome: 'Produto 1',
        preco_unitario: 10.50,
        tipo_medida: 'unidade',
      });
      await createTestProduct(testContext.prismaService, {
        nome: 'Produto 2',
        preco_unitario: 15.75,
        tipo_medida: 'kg',
      });
    });

    it('should list products when authenticated as admin', async () => {
      const response = await request(testContext.app.getHttpServer())
        .get('/produtos')
        .set('Authorization', `Bearer ${testContext.adminToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.meta.itemCount).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(10);

    });

    it('should list products when authenticated as user', async () => {
      const response = await request(testContext.app.getHttpServer())
        .get('/produtos')
        .set('Authorization', `Bearer ${testContext.userToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.meta.itemCount).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(10);
    });

    it('should not list products without authentication', async () => {
      await request(testContext.app.getHttpServer())
        .get('/produtos')
        .expect(401);
    });
  });

  describe('PATCH /produtos/:id', () => {
    let produtoId: number;

    beforeEach(async () => {
      // Criar produto para teste usando helper
      const produto = await createTestProduct(testContext.prismaService, {
        nome: 'Produto para Atualizar',
        preco_unitario: 10.50,
        tipo_medida: 'unidade',
      });
      produtoId = produto.id;
    });

    it('should update product when admin is authenticated', async () => {
      const updateData = {
        nome: 'Produto Atualizado',
        preco_unitario: 12.75,
      };

      const response = await request(testContext.app.getHttpServer())
        .patch(`/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${testContext.adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.nome).toBe(updateData.nome);
      expect(response.body.preco_unitario).toBe(updateData.preco_unitario);
    });

    it('should not update product when user is not admin', async () => {
      const updateData = {
        nome: 'Produto Atualizado',
      };

      await request(testContext.app.getHttpServer())
        .patch(`/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${testContext.userToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /produtos/:id', () => {
    let produtoId: number;

    beforeEach(async () => {
      // Criar produto para teste usando helper
      const produto = await createTestProduct(testContext.prismaService, {
        nome: 'Produto para Deletar',
        preco_unitario: 10.50,
        tipo_medida: 'unidade',
      });
      produtoId = produto.id;
    });

    it('should delete product when admin is authenticated', async () => {
      await request(testContext.app.getHttpServer())
        .delete(`/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${testContext.adminToken}`)
        .expect(200);

      // Verificar se o produto foi marcado como deletado
      const deletedProduto = await testContext.prismaService.produto.findUnique({
        where: { id: produtoId },
      });
      expect(deletedProduto.deleted_at).not.toBeNull();
    });

    it('should not delete product when user is not admin', async () => {
      await request(testContext.app.getHttpServer())
        .delete(`/produtos/${produtoId}`)
        .set('Authorization', `Bearer ${testContext.userToken}`)
        .expect(403);

      // Verificar se o produto não foi deletado
      const produto = await testContext.prismaService.produto.findUnique({
        where: { id: produtoId },
      });
      expect(produto.deleted_at).toBeNull();
    });
  });
});