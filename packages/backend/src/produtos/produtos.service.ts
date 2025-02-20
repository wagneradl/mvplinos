import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Page } from '../common/interfaces/page.interface';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProdutoDto: CreateProdutoDto) {
    try {
      // Verificar se já existe produto com o mesmo nome
      const existingProduto = await this.prisma.produto.findFirst({
        where: {
          nome: createProdutoDto.nome,
          deleted_at: null,
        },
      });

      if (existingProduto) {
        throw new BadRequestException('Já existe um produto com este nome');
      }

      return await this.prisma.$transaction(async (prisma) => {
        return await prisma.produto.create({
          data: createProdutoDto,
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao criar produto');
    }
  }

  async findAll(pageOptions?: PageOptionsDto): Promise<Page<any>> {
    try {
      const { page = 1, limit = 10, search, status, orderBy, order = 'asc' } = pageOptions || {};
      const skip = (page - 1) * limit;

      const where: Prisma.ProdutoWhereInput = {
        deleted_at: null,
      };

      // Adicionar filtro por status se fornecido
      if (status) {
        where.status = status;
      }

      // Adicionar busca por nome se fornecida
      if (search) {
        where.nome = {
          contains: search.toLowerCase(),
        };
      }

      // Configurar ordenação
      let orderByClause: Prisma.ProdutoOrderByWithRelationInput = { nome: order };
      if (orderBy === 'preco_unitario') {
        orderByClause = { preco_unitario: order };
      }

      const [items, total] = await Promise.all([
        this.prisma.produto.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: orderByClause,
        }),
        this.prisma.produto.count({ where }),
      ]);

      const pageCount = Math.ceil(total / limit);
      const hasPreviousPage = page > 1;
      const hasNextPage = page < pageCount;

      return {
        data: items,
        meta: {
          page,
          limit,
          itemCount: total,
          pageCount,
          hasPreviousPage,
          hasNextPage,
        },
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      throw new BadRequestException('Erro ao buscar produtos');
    }
  }

  async findOne(id: number) {
    try {
      const produto = await this.prisma.produto.findFirst({
        where: { id, deleted_at: null },
      });

      if (!produto) {
        throw new NotFoundException(`Produto com ID ${id} não encontrado`);
      }

      return produto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar produto');
    }
  }

  async update(id: number, updateProdutoDto: UpdateProdutoDto) {
    try {
      // Verificar se o produto existe e não está deletado
      await this.findOne(id);

      // Se o nome está sendo atualizado, verificar duplicação
      if (updateProdutoDto.nome) {
        const existingProduto = await this.prisma.produto.findFirst({
          where: {
            nome: updateProdutoDto.nome,
            id: { not: id },
            deleted_at: null,
          },
        });

        if (existingProduto) {
          throw new BadRequestException('Já existe um produto com este nome');
        }
      }

      return await this.prisma.produto.update({
        where: { id },
        data: updateProdutoDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível atualizar o produto');
    }
  }

  async remove(id: number) {
    try {
      // Verificar se o produto existe e não está deletado
      await this.findOne(id);

      // Verificar se o produto está sendo usado em algum pedido
      const pedidoComProduto = await this.prisma.itemPedido.findFirst({
        where: {
          produto_id: id,
          pedido: {
            deleted_at: null,
          },
        },
      });

      if (pedidoComProduto) {
        throw new BadRequestException('Não é possível excluir um produto que está sendo usado em pedidos');
      }

      return await this.prisma.produto.update({
        where: { id },
        data: { 
          deleted_at: new Date(),
          status: 'inativo',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível remover o produto');
    }
  }
}