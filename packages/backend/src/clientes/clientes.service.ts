import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
      return await this.prisma.$transaction(async (prisma) => {
        // Verifica se já existe um cliente com o mesmo CNPJ
        const existingCliente = await prisma.cliente.findFirst({
          where: {
            cnpj: createClienteDto.cnpj,
            deleted_at: null,
          },
        });

        if (existingCliente) {
          throw new ConflictException('CNPJ já cadastrado');
        }

        // Cria o cliente
        try {
          return await prisma.cliente.create({
            data: createClienteDto,
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('CNPJ já cadastrado');
          }
          throw new BadRequestException('Não foi possível criar o cliente');
        }
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível criar o cliente');
    }
  }

  async findByCnpj(cnpj: string) {
    try {
      const cliente = await this.prisma.cliente.findFirst({
        where: { 
          cnpj,
          deleted_at: null 
        },
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
        throw new NotFoundException('Cliente não encontrado');
      }

      return cliente;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar cliente');
    }
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    try {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id, deleted_at: null },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
      }

      try {
        return await this.prisma.cliente.update({
          where: { id },
          data: updateClienteDto,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('CNPJ já cadastrado');
        }
        throw new BadRequestException('Não foi possível atualizar o cliente');
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível atualizar o cliente');
    }
  }

  async remove(id: number) {
    try {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id, deleted_at: null },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
      }

      return await this.prisma.cliente.update({
        where: { id },
        data: { 
          deleted_at: new Date(),
          status: 'inativo'
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível remover o cliente');
    }
  }

  async findAll(pageOptions?: PageOptionsDto): Promise<Page<any>> {
    try {
      const { page = 1, limit = 10 } = pageOptions || {};
      const skip = (page - 1) * limit;

      const where = { deleted_at: null };

      const total = await this.prisma.cliente.count({ where });
      const items = await this.prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { razao_social: 'asc' },
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
      throw new BadRequestException('Erro ao buscar clientes');
    }
  }

  async findOne(id: number) {
    try {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id, deleted_at: null },
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
        throw new NotFoundException('Cliente não encontrado');
      }

      return cliente;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar cliente');
    }
  }
}