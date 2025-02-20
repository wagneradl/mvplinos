import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto, PedidoStatus } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
import { Prisma } from '@prisma/client';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async create(createPedidoDto: CreatePedidoDto) {
    const { cliente_id, itens } = createPedidoDto;

    // Validar se o pedido tem itens
    if (!itens || itens.length === 0) {
      throw new BadRequestException('O pedido deve ter pelo menos um item');
    }

    // Buscar informações dos produtos
    const produtosIds = itens.map(item => item.produto_id);
    const produtos = await this.prisma.produto.findMany({
      where: {
        id: {
          in: produtosIds
        }
      }
    });

    // Mapear produtos por ID para fácil acesso
    const produtosMap = new Map(produtos.map(p => [p.id, p]));

    // Criar array com informações completas dos itens
    const produtosInfo = itens.map(item => {
      const produto = produtosMap.get(item.produto_id);
      if (!produto) {
        throw new NotFoundException(`Produto com ID ${item.produto_id} não encontrado`);
      }

      // Validar se o produto está ativo
      if (produto.status === 'inativo') {
        throw new BadRequestException(`${produto.nome} está inativo`);
      }

      // Validar se o produto não está deletado
      if (produto.deleted_at) {
        throw new BadRequestException(`${produto.nome} não está disponível`);
      }

      // Validar quantidade
      if (item.quantidade <= 0) {
        throw new BadRequestException('A quantidade deve ser maior que zero');
      }

      // Usar sempre o preço atual do produto
      const valor_total_item = Number((item.quantidade * produto.preco_unitario).toFixed(2));

      return {
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: produto.preco_unitario,
        valor_total_item
      };
    });

    // Calcular o valor total do pedido
    const valorTotal = Number(produtosInfo.reduce((total, item) => {
      return total + item.valor_total_item;
    }, 0).toFixed(2));

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verificar se o cliente existe e não está deletado
        const cliente = await tx.cliente.findFirst({
          where: { id: cliente_id, deleted_at: null },
        });

        if (!cliente) {
          throw new NotFoundException(`Cliente com ID ${cliente_id} não encontrado`);
        }

        // Validar se o cliente está ativo
        if (cliente.status === 'inativo') {
          throw new BadRequestException('Cliente está inativo');
        }

        // Criar o pedido com os itens
        const pedido = await tx.pedido.create({
          data: {
            cliente_id,
            data_pedido: new Date(),
            valor_total: valorTotal,
            status: PedidoStatus.PENDENTE,
            pdf_path: '', // Será atualizado após gerar o PDF
            itensPedido: {
              create: produtosInfo,
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

        // Gerar PDF do pedido
        const pdfPath = await this.pdfService.generatePedidoPdf(pedido);
        
        // Atualizar o pedido com o caminho do PDF
        return await tx.pedido.update({
          where: { id: pedido.id },
          data: { pdf_path: pdfPath },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true
              }
            }
          }
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Erro ao criar pedido');
      }
      throw error;
    }
  }

  async findAll(filter: FilterPedidoDto) {
    try {
      const { page = 1, limit = 10, startDate, endDate, clienteId } = filter;
      const skip = (page - 1) * limit;

      const where: Prisma.PedidoWhereInput = {
        deleted_at: null,
      };

      if (startDate && endDate) {
        const dataInicial = new Date(startDate);
        dataInicial.setHours(0, 0, 0, 0);
        
        const dataFinal = new Date(endDate);
        dataFinal.setHours(23, 59, 59, 999);

        where.data_pedido = {
          gte: dataInicial,
          lte: dataFinal,
        };
      }

      if (clienteId) {
        where.cliente_id = clienteId;
      }

      const [data, total] = await Promise.all([
        this.prisma.pedido.findMany({
          skip,
          take: limit,
          where,
          orderBy: {
            data_pedido: 'desc',
          },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        }),
        this.prisma.pedido.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('Erro ao buscar pedidos');
    }
  }

  async findOne(id: number) {
    try {
      const pedido = await this.prisma.pedido.findFirst({
        where: { id, deleted_at: null },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }

      return pedido;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar pedido');
    }
  }

  async update(id: number, updatePedidoDto: UpdatePedidoDto) {
    try {
      const pedido = await this.prisma.pedido.findFirst({
        where: { id }, 
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }

      if (pedido.status === PedidoStatus.CANCELADO) {
        throw new BadRequestException('Não é possível atualizar um pedido cancelado');
      }

      // Validar se está tentando cancelar um pedido atualizado
      if (updatePedidoDto.status === PedidoStatus.CANCELADO && pedido.status === PedidoStatus.ATUALIZADO) {
        throw new BadRequestException('Não é possível cancelar um pedido atualizado');
      }

      // Atualizar o pedido
      const pedidoAtualizado = await this.prisma.pedido.update({
        where: { id },
        data: updatePedidoDto,
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      // Gerar novo PDF se o status foi alterado
      if (updatePedidoDto.status && updatePedidoDto.status !== pedido.status) {
        const timestamp = Date.now();
        const pdfPath = await this.pdfService.generatePedidoPdf({
          ...pedidoAtualizado,
          id: `${pedidoAtualizado.id}-${timestamp}` // Gerar um ID único para o PDF
        });
        
        // Atualizar o pedido com o caminho do PDF
        return await this.prisma.pedido.update({
          where: { id },
          data: { pdf_path: pdfPath },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        });
      }

      return pedidoAtualizado;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao atualizar pedido');
    }
  }

  async remove(id: number) {
    try {
      const pedido = await this.findOne(id);

      return await this.prisma.pedido.update({
        where: { id },
        data: { 
          deleted_at: new Date(),
          status: PedidoStatus.CANCELADO
        },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao remover pedido');
    }
  }

  async repeat(id: number) {
    try {
      const pedidoOriginal = await this.findOne(id);

      // Verificar se o cliente ainda está ativo
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: pedidoOriginal.cliente_id, deleted_at: null },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente com ID ${pedidoOriginal.cliente_id} não encontrado`);
      }

      // Verificar se todos os produtos ainda estão ativos
      const produtosIds = pedidoOriginal.itensPedido.map(item => item.produto_id);
      const produtos = await this.prisma.produto.findMany({
        where: { 
          id: { in: produtosIds },
          deleted_at: null
        },
      });

      if (produtos.length !== produtosIds.length) {
        throw new BadRequestException('Um ou mais produtos do pedido original não estão mais disponíveis');
      }

      // Criar novo pedido com os mesmos dados
      const novoPedido = await this.create({
        cliente_id: pedidoOriginal.cliente_id,
        itens: pedidoOriginal.itensPedido.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
        })),
      });

      return novoPedido;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao repetir pedido');
    }
  }

  async updateItemQuantidade(pedidoId: number, itemId: number, quantidade: number) {
    try {
      const pedido = await this.prisma.pedido.findFirst({
        where: { id: pedidoId },
        include: {
          itensPedido: true
        }
      });

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${pedidoId} não encontrado`);
      }

      if (pedido.status === PedidoStatus.CANCELADO) {
        throw new BadRequestException('Não é possível atualizar um pedido cancelado');
      }

      const item = await this.prisma.itemPedido.findFirst({
        where: { id: itemId, pedido_id: pedidoId },
        include: {
          produto: true
        }
      });

      if (!item) {
        throw new NotFoundException(`Item com ID ${itemId} não encontrado no pedido ${pedidoId}`);
      }

      // Validar quantidade
      if (quantidade <= 0) {
        throw new BadRequestException('A quantidade deve ser maior que zero');
      }

      // Atualizar item e recalcular valores
      const valor_total_item = Number((quantidade * item.preco_unitario).toFixed(2));

      const itemAtualizado = await this.prisma.itemPedido.update({
        where: { id: itemId },
        data: {
          quantidade,
          valor_total_item
        }
      });

      // Recalcular valor total do pedido
      const itensAtualizados = pedido.itensPedido.map(i => {
        if (i.id === itemId) {
          return itemAtualizado;
        }
        return i;
      });

      const valor_total = Number(itensAtualizados.reduce((total, i) => {
        return total + (i.id === itemId ? valor_total_item : i.valor_total_item);
      }, 0).toFixed(2));

      // Atualizar pedido
      return await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          valor_total,
          status: PedidoStatus.ATUALIZADO
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao atualizar quantidade do item');
    }
  }

  async getPdfPath(id: number): Promise<string> {
    const pedido = await this.prisma.pedido.findFirst({
      where: { id, deleted_at: null }
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
    }

    if (!pedido.pdf_path) {
      throw new NotFoundException(`PDF do pedido com ID ${id} não encontrado`);
    }

    const fullPath = join(process.cwd(), pedido.pdf_path);
    if (!existsSync(fullPath)) {
      throw new NotFoundException(`Arquivo PDF do pedido com ID ${id} não encontrado no sistema`);
    }

    return fullPath;
  }
}
