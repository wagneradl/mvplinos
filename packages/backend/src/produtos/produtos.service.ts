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
      return await this.prisma.$transaction(async (prisma) => {
        return await prisma.produto.create({
          data: createProdutoDto,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Erro ao criar produto');
      }
      throw error;
    }
  }

  async findAll(pageOptions?: PageOptionsDto): Promise<Page<any>> {
    try {
      const { page = 1, limit = 10 } = pageOptions || {};
      const skip = (page - 1) * limit;

      const where = { deleted_at: null };

      const total = await this.prisma.produto.count({ where });
      const items = await this.prisma.produto.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { nome: 'asc' },
      });

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
    const produto = await this.prisma.produto.findFirst({
      where: { id, deleted_at: null },
    });

    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    return produto;
  }

  async update(id: number, updateProdutoDto: UpdateProdutoDto) {
    const produto = await this.findOne(id);
    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    try {
      return await this.prisma.produto.update({
        where: { id },
        data: updateProdutoDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Erro ao atualizar produto');
      }
      throw new BadRequestException('Não foi possível atualizar o produto');
    }
  }

  async remove(id: number) {
    const produto = await this.prisma.produto.findFirst({
      where: { id, deleted_at: null },
    });

    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    try {
      return await this.prisma.produto.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Erro ao remover produto');
      }
      throw new BadRequestException('Não foi possível remover o produto');
    }
  }
}
