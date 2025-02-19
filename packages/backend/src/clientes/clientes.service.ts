import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SoftDelete } from '../common/interfaces/soft-delete.interface';
import { Page } from '../common/interfaces/page.interface';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClienteDto: CreateClienteDto) {
    try {
      return await this.prisma.cliente.create({
        data: createClienteDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('CNPJ já cadastrado');
        }
      }
      throw error;
    }
  }

  async findAll(pageOptions?: PageOptionsDto): Promise<Page<any>> {
    const { page = 1, limit = 10 } = pageOptions || {};
    const skip = (page - 1) * limit;

    const where = { deleted_at: null };

    try {
      const [items, total] = await Promise.all([
        this.prisma.cliente.findMany({
          where,
          skip,
          take: limit,
          orderBy: { razao_social: 'asc' },
        }),
        this.prisma.cliente.count({ where }),
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
      throw new BadRequestException('Erro ao buscar clientes');
    }
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deleted_at: null } as any,
      include: {
        pedidos: {
          where: { deleted_at: null },
          select: {
            id: true,
            data_pedido: true,
            status: true,
            valor_total: true,
          },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    const cliente = await this.findOne(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    try {
      return await this.prisma.cliente.update({
        where: { id },
        data: updateClienteDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('CNPJ já cadastrado');
        }
      }
      throw new BadRequestException('Não foi possível atualizar o cliente');
    }
  }

  async remove(id: number) {
    const cliente = await this.findOne(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    try {
      return await this.prisma.cliente.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
    } catch (error) {
      throw new BadRequestException('Não foi possível remover o cliente');
    }
  }

  async findByCnpj(cnpj: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { cnpj, deleted_at: null } as any,
      include: {
        pedidos: {
          where: { deleted_at: null },
          select: {
            id: true,
            data_pedido: true,
            status: true,
            valor_total: true,
          },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente com CNPJ ${cnpj} não encontrado`);
    }

    return cliente;
  }
}
