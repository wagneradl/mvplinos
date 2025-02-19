import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async create(createPedidoDto: CreatePedidoDto) {
    const { cliente_id, itens } = createPedidoDto;

    // Verificar se o cliente existe e não está deletado
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: cliente_id, deleted_at: null },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente com ID ${cliente_id} não encontrado`);
    }

    // Buscar informações dos produtos e calcular valores
    const produtosInfo = await Promise.all(
      itens.map(async (item) => {
        const produto = await this.prisma.produto.findFirst({
          where: { id: item.produto_id, deleted_at: null },
        });

        if (!produto) {
          throw new NotFoundException(
            `Produto com ID ${item.produto_id} não encontrado`,
          );
        }

        return {
          ...item,
          preco_unitario: produto.preco_unitario,
          valor_total_item: produto.preco_unitario * item.quantidade,
        };
      }),
    );

    const valor_total = produtosInfo.reduce(
      (sum, item) => sum + item.valor_total_item,
      0,
    );

    // Criar o pedido com seus itens em uma transação
    return this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          cliente_id,
          data_pedido: new Date(),
          status: 'PENDENTE',
          valor_total,
          caminho_pdf: '', // Será atualizado após gerar o PDF
          itensPedido: {
            create: produtosInfo.map((item) => ({
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              valor_total_item: item.valor_total_item,
            })),
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
      const pedidoAtualizado = await tx.pedido.update({
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

      return pedido;
    });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, pedidos] = await Promise.all([
      this.prisma.pedido.count({
        where: { deleted_at: null },
      }),
      this.prisma.pedido.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
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
    await this.findOne(id); // Verifica se existe

    // Por enquanto, só permite atualizar o status
    return this.prisma.pedido.update({
      where: { id },
      data: {
        status: 'ATUALIZADO',
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
  }

  async remove(id: number) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.pedido.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        status: 'CANCELADO',
      },
    });
  }

  async repeatOrder(id: number) {
    const originalPedido = await this.findOne(id);

    return this.create({
      cliente_id: originalPedido.cliente_id,
      itens: originalPedido.itensPedido.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
      })),
    });
  }
}
