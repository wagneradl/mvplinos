import request from 'supertest';
import { app, prismaService } from '../../../test/setup-integration';

describe('Clientes Integration Tests', () => {

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

      expect(response.body).toEqual({
        id: expect.any(Number),
        ...cliente,
        deleted_at: null,
      });
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
      const cliente = {
        razao_social: 'Empresa Teste',
        nome_fantasia: 'Empresa Teste Ltda',
        cnpj: '12.345.678/9012-34',
        email: 'teste@empresa.com',
        telefone: '(11) 99999-9999',
        status: 'ativo',
      };

      await request(app.getHttpServer())
        .post('/clientes')
        .send(cliente)
        .expect(201);

      return request(app.getHttpServer())
        .post('/clientes')
        .send(cliente)
        .expect(409)
        .expect({
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
        const data = {
          razao_social: `Empresa ${i + 1}`,
          nome_fantasia: `Empresa ${i + 1} Ltda`,
          cnpj: `${num}.345.678/0001-${num}`,
          email: `empresa${i + 1}@teste.com`,
          telefone: `(11) 99999-${(i + 1).toString().padStart(4, '0')}`,
          status: 'ativo',
        };
        await prismaService.cliente.create({ data });
      }

      // Test first page
      const response1 = await request(app.getHttpServer())
        .get('/clientes')
        .query({ page: 1, limit: 10 });

      expect(response1.status).toBe(200);
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
        .query({ page: 2, limit: 10 });

      expect(response2.status).toBe(200);
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
      return request(app.getHttpServer())
        .get('/clientes')
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

    it('should return array of clientes', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      return request(app.getHttpServer())
        .get('/clientes')
        .expect(200)
        .expect(res => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].id).toBe(cliente.id);
          expect(res.body.data[0].razao_social).toBe(cliente.razao_social);
          expect(res.body.data[0].cnpj).toBe(cliente.cnpj);
          expect(res.body.data[0].email).toBe(cliente.email);
          expect(res.body.data[0].telefone).toBe(cliente.telefone);

          expect(res.body.data[0].status).toBe(cliente.status);
        });
    });
  });

  describe('/clientes/:id (GET)', () => {
    it('should return 404 for non-existent cliente', async () => {
      return request(app.getHttpServer())
        .get('/clientes/999')
        .expect(404)
        .expect({
          message: 'Cliente com ID 999 não encontrado',
          error: 'Not Found',
          statusCode: 404,
        });
    });

    it('should return cliente if exists', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/clientes/${cliente.id}`)
        .expect(200);

      expect(response.body).toEqual({
        ...cliente,
        pedidos: [],
      });
    });
  });

  describe('/clientes/:id (PATCH)', () => {
    it('should update cliente', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      const updateData = {
        razao_social: 'Empresa Teste Atualizada',
        email: 'novo@empresa.com',
      };

      const response = await request(app.getHttpServer())
        .patch(`/clientes/${cliente.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        ...cliente,
        ...updateData,
      });
    });

    it('should not allow update to existing CNPJ', async () => {
      const cliente1 = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa 1',
          nome_fantasia: 'Empresa 1 Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'empresa1@teste.com',
          telefone: '(11) 99999-9991',
          status: 'ativo',
        },
      });

      const cliente2 = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa 2',
          nome_fantasia: 'Empresa 2 Ltda',
          cnpj: '12.345.678/9012-35',
          email: 'empresa2@teste.com',
          telefone: '(11) 99999-9992',
          status: 'ativo',
        },
      });

      return request(app.getHttpServer())
        .patch(`/clientes/${cliente2.id}`)
        .send({ cnpj: cliente1.cnpj })
        .expect(409)
        .expect({
          message: 'CNPJ já cadastrado',
          error: 'Conflict',
          statusCode: 409,
        });
    });
  });

  describe('/clientes/:id (DELETE)', () => {
    it('should soft delete cliente', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .expect(200);

      const deletedCliente = await prismaService.cliente.findUnique({
        where: { id: cliente.id },
      });

      expect(deletedCliente.deleted_at).not.toBeNull();
    });

    it('should not list soft deleted clientes', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/clientes')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should not find soft deleted cliente by id', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/clientes/${cliente.id}`)
        .expect(404)
        .expect({
          message: `Cliente com ID ${cliente.id} não encontrado`,
          error: 'Not Found',
          statusCode: 404,
        });
    });

    it('should return 404 for non-existent cliente', async () => {
      return request(app.getHttpServer())
        .delete('/clientes/999')
        .expect(404)
        .expect({
          message: 'Cliente com ID 999 não encontrado',
          error: 'Not Found',
          statusCode: 404,
        });
    });
  });

  describe('/clientes/cnpj/:cnpj (GET)', () => {
    it('should return 404 for non-existent cliente', async () => {
      return request(app.getHttpServer())
        .get('/clientes/cnpj/99999999999999')
        .expect(404)
        .expect({
          message: 'Cliente com CNPJ 99999999999999 não encontrado',
          error: 'Not Found',
          statusCode: 404,
        });
    });

    it('should return cliente if exists', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/clientes/cnpj/${encodeURIComponent(cliente.cnpj)}`)
        .expect(200);

      expect(response.body).toEqual({
        ...cliente,
        pedidos: [],
      });
    });

    it('should not find soft deleted cliente by cnpj', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Empresa Teste Ltda',
          cnpj: '12.345.678/9012-34',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999',
          status: 'ativo',
        },
      });

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/clientes/cnpj/${encodeURIComponent(cliente.cnpj)}`)
        .expect(404)
        .expect({
          message: `Cliente com CNPJ ${cliente.cnpj} não encontrado`,
          error: 'Not Found',
          statusCode: 404,
        });
    });
  });
});
