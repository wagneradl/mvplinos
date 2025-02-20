import request from 'supertest';
import { app, prismaService } from '../../../test/setup-integration';

describe('Clientes Integration Tests', () => {
  const createTestCliente = async (data = {}) => {
    const defaultData = {
      razao_social: 'Empresa Teste',
      nome_fantasia: 'Empresa Teste Ltda',
      cnpj: '12.345.678/9012-34',
      email: 'teste@empresa.com',
      telefone: '(11) 99999-9999',
      status: 'ativo',
      ...data,
    };

    return await prismaService.cliente.create({
      data: defaultData,
    });
  };

  describe('/clientes (POST)', () => {
    it('should create cliente', async () => {
      const cliente = {
        razao_social: 'Empresa Teste',
        nome_fantasia: 'Empresa Teste Ltda',
        cnpj: '12.345.678/9012-34',
        email: 'teste@empresa.com',
        telefone: '(11) 99999-9999',
        status: 'ativo',
      };

      const response = await request(app.getHttpServer())
        .post('/clientes')
        .send(cliente)
        .expect(201);

      expect(response.body).toEqual(expect.objectContaining({
        id: expect.any(Number),
        ...cliente,
      }));
    });

    it('should validate required fields', async () => {
      const cliente = {
        razao_social: '',
        nome_fantasia: '',
        cnpj: '12.345.678',
        email: 'invalid-email',
        telefone: '(11) 1234-5',
        status: 'invalid',
      };

      const response = await request(app.getHttpServer())
        .post('/clientes')
        .send(cliente)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'razao_social should not be empty',
          'nome_fantasia should not be empty',
          'CNPJ inválido. Use o formato: XX.XXX.XXX/XXXX-XX',
          'email must be an email',
          'Telefone inválido. Use o formato: (XX) XXXXX-XXXX',
          'status must be one of the following values: ativo, inativo',
        ]),
      );
    });

    it('should not allow duplicate CNPJ', async () => {
      const cliente = await createTestCliente();

      const response = await request(app.getHttpServer())
        .post('/clientes')
        .send({
          razao_social: cliente.razao_social,
          nome_fantasia: cliente.nome_fantasia,
          cnpj: cliente.cnpj,
          email: cliente.email,
          telefone: cliente.telefone,
          status: cliente.status,
        })
        .expect(409);

      expect(response.body).toEqual({
        message: 'CNPJ já cadastrado',
        error: 'Conflict',
        statusCode: 409,
      });
    });
  });

  describe('/clientes (GET)', () => {
    it('should return paginated clientes', async () => {
      // Create test data sequentially
      for (let i = 0; i < 15; i++) {
        const num = (i + 1).toString().padStart(2, '0');
        await createTestCliente({
          razao_social: `Empresa ${i + 1}`,
          nome_fantasia: `Empresa ${i + 1} Ltda`,
          cnpj: `${num}.345.678/0001-${num}`,
          email: `empresa${i + 1}@teste.com`,
          telefone: `(11) 99999-${(i + 1).toString().padStart(4, '0')}`,
        });
      }

      // Test first page
      const response1 = await request(app.getHttpServer())
        .get('/clientes')
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
        .get('/clientes')
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

    it('should return empty array when no clientes', async () => {
      const response = await request(app.getHttpServer())
        .get('/clientes')
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

    it('should return array of clientes', async () => {
      const cliente = await createTestCliente();

      const response = await request(app.getHttpServer())
        .get('/clientes')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(expect.objectContaining({
        id: cliente.id,
        razao_social: cliente.razao_social,
        nome_fantasia: cliente.nome_fantasia,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        status: cliente.status,
      }));
    });
  });

  describe('/clientes/:id (GET)', () => {
    it('should return 404 for non-existent cliente', async () => {
      const response = await request(app.getHttpServer())
        .get('/clientes/999')
        .expect(404);

      expect(response.body).toEqual({
        message: 'Cliente com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return cliente if exists', async () => {
      const cliente = await createTestCliente();

      const response = await request(app.getHttpServer())
        .get(`/clientes/${cliente.id}`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: cliente.id,
        razao_social: cliente.razao_social,
        nome_fantasia: cliente.nome_fantasia,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        status: cliente.status,
      }));
    });
  });

  describe('/clientes/:id (PATCH)', () => {
    it('should update cliente', async () => {
      const cliente = await createTestCliente();

      const updateData = {
        razao_social: 'Empresa Atualizada',
        nome_fantasia: 'Empresa Atualizada Ltda',
      };

      const response = await request(app.getHttpServer())
        .patch(`/clientes/${cliente.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: cliente.id,
        ...updateData,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        status: cliente.status,
      }));
    });

    it('should return 404 for non-existent cliente', async () => {
      const updateData = {
        razao_social: 'Empresa Atualizada',
      };

      const response = await request(app.getHttpServer())
        .patch('/clientes/999')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        message: 'Cliente com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      });
    });
  });

  describe('/clientes/:id (DELETE)', () => {
    it('should soft delete cliente', async () => {
      const cliente = await createTestCliente();

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .expect(200);

      const deletedCliente = await prismaService.cliente.findUnique({
        where: { id: cliente.id },
      });

      expect(deletedCliente.deleted_at).not.toBeNull();
      expect(deletedCliente.status).toBe('inativo');
    });

    it('should return 404 for non-existent cliente', async () => {
      const response = await request(app.getHttpServer())
        .delete('/clientes/999')
        .expect(404);

      expect(response.body).toEqual({
        message: 'Cliente com ID 999 não encontrado',
        error: 'Not Found',
        statusCode: 404,
      });
    });
  });

  describe('/clientes/cnpj/:cnpj (GET)', () => {
    it('should return 404 for non-existent cliente', async () => {
      const cnpj = '99.999.999/9999-99';
      const response = await request(app.getHttpServer())
        .get(`/clientes/cnpj/${encodeURIComponent(cnpj)}`)
        .expect(404);

      expect(response.body).toEqual({
        message: `Cliente com CNPJ ${cnpj} não encontrado`,
        error: 'Not Found',
        statusCode: 404,
      });
    });

    it('should return cliente if exists', async () => {
      const cliente = await createTestCliente();

      const response = await request(app.getHttpServer())
        .get(`/clientes/cnpj/${encodeURIComponent(cliente.cnpj)}`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: cliente.id,
        razao_social: cliente.razao_social,
        nome_fantasia: cliente.nome_fantasia,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        status: cliente.status,
      }));
    });
  });
});
