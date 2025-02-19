import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Page } from '../common/interfaces/page.interface';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { SoftDelete } from '../common/interfaces/soft-delete.interface';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProdutoDto: CreateProdutoDto) {
    return await this.prisma.produto.create({
      data: createProdutoDto,
    });
  }

  async findAll(pageOptions?: PageOptionsDto): Promise<Page<any>> {
    const page = Number(pageOptions?.page || 1);
    const limit = Number(pageOptions?.limit || 10);
    const skip = (page - 1) * limit;

    const where = { deleted_at: null } as any;

    const [items, total] = await Promise.all([
      this.prisma.produto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.produto.count({ where }),
    ]);

    const pageCount = Math.ceil(total / limit);

    return {
      data: items,
      meta: {
        page,
        limit,
        itemCount: total,
        pageCount,
        hasPreviousPage: page > 1,
        hasNextPage: page < pageCount,
      },
    };
  }

  async findOne(id: number) {
    const produto = await this.prisma.produto.findFirst({
      where: { id, deleted_at: null } as any,
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
      throw new BadRequestException('Não foi possível atualizar o produto');
    }
  }

  async remove(id: number) {
    const produto = await this.findOne(id);
    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    try {
      return await this.prisma.produto.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
    } catch (error) {
      throw new BadRequestException('Não foi possível remover o produto');
    }
  }
}
