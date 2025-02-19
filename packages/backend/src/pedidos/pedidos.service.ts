import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto, PedidoStatus } from './dto/update-pedido.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async create(createPedidoDto: CreatePedidoDto) {
    const { cliente_id, itens } = createPedidoDto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verificar se o cliente existe e não está deletado
        const cliente = await tx.cliente.findFirst({
          where: { id: cliente_id, deleted_at: null },
        });

        if (!cliente) {
          throw new NotFoundException(`Cliente com ID ${cliente_id} não encontrado`);
        }

        // Buscar informações dos produtos e calcular valores
        const produtosInfo = await Promise.all(
          itens.map(async (item) => {
            const produto = await tx.produto.findFirst({
              where: { id: item.produto_id, deleted_at: null },
            });

            if (!produto) {
              throw new NotFoundException(`Produto com ID ${item.produto_id} não encontrado`);
            }

            const valorTotalItem = produto.preco_unitario * item.quantidade;

            return {
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              preco_unitario: produto.preco_unitario,
              valor_total_item: valorTotalItem,
            };
          }),
        );

        const valor_total = produtosInfo.reduce((sum, item) => sum + item.valor_total_item, 0);

        const pedido = await tx.pedido.create({
          data: {
            cliente_id,
            data_pedido: new Date(),
            status: PedidoStatus.PENDENTE,
            valor_total,
            caminho_pdf: '', // Será atualizado após gerar o PDF
            itensPedido: {
              create: produtosInfo,
            },
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

        // Gerar PDF do pedido
        const pdfPath = await this.pdfService.generatePedidoPdf(pedido);

        // Atualizar o caminho do PDF no pedido
        return await tx.pedido.update({
          where: { id: pedido.id },
          data: { caminho_pdf: pdfPath },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
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

  async findAll(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const where = { deleted_at: null };

      const [total, pedidos] = await Promise.all([
        this.prisma.pedido.count({ where }),
        this.prisma.pedido.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
          orderBy: { data_pedido: 'desc' },
        }),
      ]);

      return {
        data: pedidos,
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
  }

  async update(id: number, updatePedidoDto: UpdatePedidoDto) {
    try {
      await this.findOne(id);

      return await this.prisma.pedido.update({
        where: { id },
        data: {
          status: updatePedidoDto.status || PedidoStatus.ATUALIZADO,
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
      throw new BadRequestException('Erro ao atualizar pedido');
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);

      return await this.prisma.pedido.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          status: PedidoStatus.CANCELADO,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao remover pedido');
    }
  }

  async repeatOrder(id: number) {
    try {
      const originalPedido = await this.findOne(id);

      return await this.create({
        cliente_id: originalPedido.cliente_id,
        itens: originalPedido.itensPedido.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
        })),
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao repetir pedido');
    }
  }
}
