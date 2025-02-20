import request from 'supertest';
import { app, prismaService } from '../../../test/setup-integration';
import { PedidoStatus } from '../dto/update-pedido.dto';

describe('Pedidos Integration Tests', () => {
  beforeEach(async () => {
    // Limpar o banco de dados antes de cada teste
    await prismaService.itensPedido.deleteMany();
    await prismaService.pedido.deleteMany();
    await prismaService.cliente.deleteMany();
    await prismaService.produto.deleteMany();
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const response = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          cliente_id: cliente.id,
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          cliente: expect.any(Object),
          itensPedido: expect.arrayContaining([
            expect.objectContaining({
              produto_id: produto.id,
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            })
          ]),
          caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
        })
      );
    });

    it('should return 404 if cliente not found', async () => {
      const produto = await prismaService.produto.create({
        data: {
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: 999,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Cliente com ID 999 não encontrado');
        });
    });

    it('should return 404 if produto not found', async () => {
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

      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: 999,
              quantidade: 2
            }
          ]
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Produto com ID 999 não encontrado');
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar alguns pedidos
      await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          data_pedido: new Date(),
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
          itensPedido: {
            create: {
              produto: {
                connect: {
                  id: produto.id
                }
              },
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get('/pedidos')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            cliente_id: cliente.id,
            status: PedidoStatus.PENDENTE,
            valor_total: 20.00,
            cliente: expect.any(Object),
            itensPedido: expect.arrayContaining([
              expect.objectContaining({
                produto_id: produto.id,
                quantidade: 2,
                preco_unitario: 10.00,
                valor_total_item: 20.00
              })
            ]),
            caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
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

    it('should filter pedidos by date range', async () => {
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar pedido com data específica
      const pedido = await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          data_pedido: new Date('2025-02-20'),
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
          itensPedido: {
            create: {
              produto: {
                connect: {
                  id: produto.id
                }
              },
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get('/pedidos')
        .query({
          page: 1,
          limit: 10,
          startDate: '2025-02-20',
          endDate: '2025-02-20'
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          cliente_id: cliente.id,
          status: PedidoStatus.PENDENTE,
          caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
        })
      );
    });

    it('should filter pedidos by cliente', async () => {
      const cliente1 = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste 1',
          nome_fantasia: 'Teste 1',
          telefone: '11999999999',
          email: 'teste1@teste.com',
          status: 'ativo'
        }
      });

      const cliente2 = await prismaService.cliente.create({
        data: {
          cnpj: '98765432109876',
          razao_social: 'Empresa Teste 2',
          nome_fantasia: 'Teste 2',
          telefone: '11888888888',
          email: 'teste2@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar pedidos para diferentes clientes
      await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente1.id
            }
          },
          data_pedido: new Date(),
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
          itensPedido: {
            create: {
              produto: {
                connect: {
                  id: produto.id
                }
              },
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            }
          }
        }
      });

      await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente2.id
            }
          },
          data_pedido: new Date(),
          status: PedidoStatus.PENDENTE,
          valor_total: 30.00,
          caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
          itensPedido: {
            create: {
              produto: {
                connect: {
                  id: produto.id
                }
              },
              quantidade: 3,
              preco_unitario: 10.00,
              valor_total_item: 30.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get('/pedidos')
        .query({
          page: 1,
          limit: 10,
          clienteId: cliente1.id
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          cliente_id: cliente1.id,
          valor_total: 20.00,
          caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
        })
      );
    });

    it('deve retornar metadados de paginação corretos', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '33333333333333',
          razao_social: 'Empresa Teste 4',
          nome_fantasia: 'Teste 4',
          telefone: '11777777777',
          email: 'teste4@teste.com',
          status: 'ativo'
        }
      });

      const produto = await prismaService.produto.create({
        data: {
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar 15 pedidos
      for (let i = 0; i < 15; i++) {
        await prismaService.pedido.create({
          data: {
            cliente: {
              connect: {
                id: cliente.id
              }
            },
            data_pedido: new Date(),
            status: PedidoStatus.PENDENTE,
            valor_total: 10.00,
            caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
            itensPedido: {
              create: {
                produto: {
                  connect: {
                    id: produto.id
                  }
                },
                quantidade: 1,
                preco_unitario: 10.00,
                valor_total_item: 10.00
              }
            }
          }
        });
      }

      // Buscar primeira página
      const response1 = await request(app.getHttpServer())
        .get('/pedidos')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response1.body.meta).toEqual({
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2
      });

      // Buscar segunda página
      const response2 = await request(app.getHttpServer())
        .get('/pedidos')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response2.body.meta).toEqual({
        total: 15,
        page: 2,
        limit: 10,
        totalPages: 2
      });
      expect(response2.body.data).toHaveLength(5);
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedido = await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          data_pedido: new Date(),
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
          itensPedido: {
            create: {
              produto: {
                connect: {
                  id: produto.id
                }
              },
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
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
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          cliente: expect.any(Object),
          itensPedido: expect.arrayContaining([
            expect.objectContaining({
              produto_id: produto.id,
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            })
          ]),
          caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
        })
      );
    });

    it('should return 404 if pedido not found', async () => {
      await request(app.getHttpServer())
        .get('/pedidos/999')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Pedido com ID 999 não encontrado');
        });
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedido = await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          data_pedido: new Date(),
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          caminho_pdf: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
          itensPedido: {
            create: {
              produto: {
                connect: {
                  id: produto.id
                }
              },
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .delete(`/pedidos/${pedido.id}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: pedido.id,
          deleted_at: expect.any(String),
          status: PedidoStatus.CANCELADO,
          caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
        })
      );

      // Verificar se o pedido não aparece mais na listagem
      const listResponse = await request(app.getHttpServer())
        .get('/pedidos')
        .expect(200);

      expect(listResponse.body.data).toHaveLength(0);
    });

    it('should return 404 if pedido not found', async () => {
      await request(app.getHttpServer())
        .delete('/pedidos/999')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Pedido com ID 999 não encontrado');
        });
    });
  });

  describe('/pedidos/:id (PATCH)', () => {
    it('should update pedido status and generate new PDF', async () => {
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar pedido
      const pedido = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(201);

      const oldPdfPath = pedido.body.caminho_pdf;

      // Atualizar status do pedido
      const response = await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.body.id}`)
        .send({
          status: PedidoStatus.ATUALIZADO
        })
        .expect(200);

      // Verificar se um novo PDF foi gerado
      expect(response.body.caminho_pdf).toBeDefined();
      expect(response.body.caminho_pdf).not.toBe(oldPdfPath);
      expect(response.body.caminho_pdf).toMatch(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/);
      expect(response.body.status).toBe(PedidoStatus.ATUALIZADO);
    });

    it('should not generate new PDF if status is not changed', async () => {
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar pedido
      const pedido = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(201);

      const oldPdfPath = pedido.body.caminho_pdf;

      // Atualizar pedido sem mudar o status
      const response = await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.body.id}`)
        .send({
          // Não enviar status
        })
        .expect(200);

      // Verificar que o PDF não foi alterado
      expect(response.body.caminho_pdf).toBe(oldPdfPath);
    });

    it('should return 404 if pedido not found', async () => {
      await request(app.getHttpServer())
        .patch('/pedidos/999')
        .send({
          status: PedidoStatus.ATUALIZADO
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Pedido com ID 999 não encontrado');
        });
    });

    it('should return 400 if trying to update cancelled pedido', async () => {
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar e cancelar pedido
      const pedido = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/pedidos/${pedido.body.id}`)
        .expect(200);

      // Tentar atualizar pedido cancelado
      await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.body.id}`)
        .send({
          status: PedidoStatus.ATUALIZADO
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Não é possível atualizar um pedido cancelado');
        });
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      // Criar pedido original
      const pedido = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(201);

      // Repetir o pedido
      const response = await request(app.getHttpServer())
        .post(`/pedidos/${pedido.body.id}/repeat`)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          cliente_id: cliente.id,
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          caminho_pdf: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/),
          itensPedido: expect.arrayContaining([
            expect.objectContaining({
              produto_id: produto.id,
              quantidade: 2,
              preco_unitario: 10.00,
              valor_total_item: 20.00
            })
          ])
        })
      );
    });

    it('should return 404 if pedido not found', async () => {
      await request(app.getHttpServer())
        .post('/pedidos/999/repeat')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Pedido com ID 999 não encontrado');
        });
    });

    it('should return 404 if the cliente of the original pedido was deleted', async () => {
      // Criar pedido
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
          nome: 'Produto Teste',
          preco_unitario: 10.00,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const pedido = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 2
            }
          ]
        })
        .expect(201);

      // Marcar cliente como excluído
      await prismaService.cliente.update({
        where: { id: cliente.id },
        data: { 
          deleted_at: new Date(),
          status: 'inativo'
        }
      });

      // Tentar repetir o pedido
      await request(app.getHttpServer())
        .post(`/pedidos/${pedido.body.id}/repeat`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe(`Cliente com ID ${cliente.id} não encontrado`);
        });
    });
  });
});
