import request from 'supertest';
import { app, prismaService } from '../../../test/setup-integration';
import { PedidoStatus } from '../dto/update-pedido.dto';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('Pedidos Integration Tests', () => {
  beforeEach(async () => {
    // Limpar o banco de dados antes de cada teste
    await prismaService.itemPedido.deleteMany();
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
          pdf_path: expect.stringMatching(/^uploads\/pdfs\/pedido-\d+(-\d+)?\.pdf$/)
        })
      );
    });

    it('should not allow order with inactive produto', async () => {
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
          status: 'inativo'
        }
      });

      await request(app.getHttpServer())
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
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Produto Teste está inativo');
        });
    });

    it('should not allow order with deleted produto', async () => {
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
          status: 'ativo',
          deleted_at: new Date()
        }
      });

      await request(app.getHttpServer())
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
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Produto Teste não está disponível');
        });
    });

    it('should validate minimum quantity', async () => {
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

      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 0
            }
          ]
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('A quantidade deve ser maior que zero');
        });
    });

    it('should use current produto price', async () => {
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
              quantidade: 2,
              preco_unitario: 8.00 // Tentar usar um preço diferente
            }
          ]
        })
        .expect(201);

      expect(response.body.itensPedido[0].preco_unitario).toBe(10.00);
      expect(response.body.itensPedido[0].valor_total_item).toBe(20.00);
    });

    it('should calculate total value correctly with multiple items', async () => {
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

      const produto1 = await prismaService.produto.create({
        data: {
          nome: 'Produto 1',
          preco_unitario: 10.50,
          tipo_medida: 'un',
          status: 'ativo'
        }
      });

      const produto2 = await prismaService.produto.create({
        data: {
          nome: 'Produto 2',
          preco_unitario: 5.75,
          tipo_medida: 'kg',
          status: 'ativo'
        }
      });

      const produto3 = await prismaService.produto.create({
        data: {
          nome: 'Produto 3',
          preco_unitario: 3.99,
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
              produto_id: produto1.id,
              quantidade: 2 // 21.00
            },
            {
              produto_id: produto2.id,
              quantidade: 1.5 // 8.63
            },
            {
              produto_id: produto3.id,
              quantidade: 3 // 11.97
            }
          ]
        })
        .expect(201);

      // Verificar valores individuais dos itens
      expect(response.body.itensPedido).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            produto_id: produto1.id,
            quantidade: 2,
            preco_unitario: 10.50,
            valor_total_item: 21.00
          }),
          expect.objectContaining({
            produto_id: produto2.id,
            quantidade: 1.5,
            preco_unitario: 5.75,
            valor_total_item: 8.63
          }),
          expect.objectContaining({
            produto_id: produto3.id,
            quantidade: 3,
            preco_unitario: 3.99,
            valor_total_item: 11.97
          })
        ])
      );

      // Verificar valor total do pedido (41.60)
      expect(response.body.valor_total).toBe(41.60);
    });

    it('should round values correctly', async () => {
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
          preco_unitario: 3.33,
          tipo_medida: 'kg',
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
              quantidade: 1.5 // 3.33 * 1.5 = 4.995
            }
          ]
        })
        .expect(201);

      expect(response.body.itensPedido[0].valor_total_item).toBe(5.00);
      expect(response.body.valor_total).toBe(5.00);
    });

    it('should not allow empty order', async () => {
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
          itens: []
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('O pedido deve ter pelo menos um item');
        });
    });

    it('should not allow order with inactive cliente', async () => {
      const cliente = await prismaService.cliente.create({
        data: {
          cnpj: '12345678901234',
          razao_social: 'Empresa Teste',
          nome_fantasia: 'Teste',
          telefone: '11999999999',
          email: 'teste@teste.com',
          status: 'inativo'
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

      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          cliente_id: cliente.id,
          itens: [
            {
              produto_id: produto.id,
              quantidade: 1
            }
          ]
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Cliente está inativo');
        });
    });
  });

  describe('/pedidos/:id (PATCH)', () => {
    it('should not allow update of cancelled pedido', async () => {
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

      // Criar pedido e cancelar
      const pedido = await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          status: PedidoStatus.CANCELADO,
          valor_total: 20.00,
          pdf_path: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
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

      await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.id}`)
        .send({
          status: PedidoStatus.ATUALIZADO
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Não é possível atualizar um pedido cancelado');
        });
    });

    it('should not allow cancellation of updated pedido', async () => {
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

      // Criar pedido atualizado
      const pedido = await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          status: PedidoStatus.ATUALIZADO,
          valor_total: 20.00,
          pdf_path: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
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
          itensPedido: true
        }
      });

      await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.id}`)
        .send({
          status: PedidoStatus.CANCELADO
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Não é possível cancelar um pedido atualizado');
        });
    });

    it('should recalculate values when updating quantities', async () => {
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
      const pedido = await prismaService.pedido.create({
        data: {
          cliente: {
            connect: {
              id: cliente.id
            }
          },
          status: PedidoStatus.PENDENTE,
          valor_total: 20.00,
          pdf_path: `uploads/pdfs/pedido-${Math.floor(Math.random() * 1000)}.pdf`,
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
          itensPedido: true
        }
      });

      const response = await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.id}/itens/${pedido.itensPedido[0].id}`)
        .send({
          quantidade: 3
        })
        .expect(200);

      expect(response.body.itensPedido[0].quantidade).toBe(3);
      expect(response.body.itensPedido[0].valor_total_item).toBe(30.00);
      expect(response.body.valor_total).toBe(30.00);
    });
  });
});
