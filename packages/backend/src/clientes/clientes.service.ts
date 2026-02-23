import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Page } from '../common/interfaces/page.interface';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Prisma } from '@prisma/client';
import { debugLog } from '../common/utils/debug-log';

export interface TenantContext {
  userId: number;
  clienteId?: number | null;
}

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(createClienteDto: CreateClienteDto) {
    try {
      debugLog('ClientesService', 'Recebido DTO do cliente:', createClienteDto);
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
      // Registrar detalhes do erro para facilitar depuração
      this.logger.error(`Erro detalhado ao criar cliente: ${error}`);
      if (error instanceof Error) {
        throw new BadRequestException(`Não foi possível criar o cliente: ${error.message}`);
      } else {
        throw new BadRequestException('Não foi possível criar o cliente');
      }
    }
  }

  async findByCnpj(cnpj: string) {
    try {
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          cnpj,
          deleted_at: null,
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
        throw new NotFoundException(`Cliente com CNPJ ${cnpj} não encontrado`);
      }

      return cliente;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar cliente');
    }
  }

  async update(id: number, updateClienteDto: UpdateClienteDto, includeDeleted: boolean = false) {
    try {
      // Construir condição de busca
      const where: Prisma.ClienteWhereInput = { id };

      // Se não deve incluir clientes excluídos, adicionar filtro
      if (!includeDeleted) {
        where.deleted_at = null;
      }

      debugLog(
        'ClientesService',
        `Atualizando cliente com ID ${id}, includeDeleted=${includeDeleted}`,
      );
      debugLog('ClientesService', 'Dados para atualização:', updateClienteDto);

      const cliente = await this.prisma.cliente.findFirst({ where });

      if (!cliente) {
        throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
      }

      try {
        // Preparar dados para atualização
        const updateData: any = { ...updateClienteDto };

        // Se estamos reativando um cliente, limpar o deleted_at
        if (updateClienteDto.status === 'ativo' && cliente.deleted_at) {
          updateData.deleted_at = null;
        }

        debugLog('ClientesService', 'Dados finais para atualização:', updateData);

        return await this.prisma.cliente.update({
          where: { id },
          data: updateData,
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
          status: 'inativo',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível remover o cliente');
    }
  }

  async findAll(pageOptions?: PageOptionsDto, includeDeleted?: boolean, tenant?: TenantContext): Promise<Page<any>> {
    try {
      const { page = 1, limit = 10, status, search } = pageOptions || {};
      const skip = (page - 1) * limit;

      // Construir condições de filtro
      const where: Prisma.ClienteWhereInput = {};

      // Tenant isolation: CLIENTE users can only see their own company
      if (tenant?.clienteId) {
        where.id = tenant.clienteId;
      }

      // Verificar se devemos incluir clientes soft-deleted
      if (includeDeleted) {
        // Se includeDeleted=true, não filtramos por deleted_at
        debugLog('ClientesService', 'Incluindo clientes soft-deleted na busca');

        // Filtrar por status se fornecido
        if (status) {
          where.status = status;
        }
      } else {
        // Lógica padrão para mostrar clientes ativos/inativos (sem soft-deleted)
        if (status === 'ativo') {
          // Clientes ativos: status = 'ativo' E não deletados
          where.status = 'ativo';
          where.deleted_at = null;
        } else if (status === 'inativo') {
          // Clientes inativos: status = 'inativo' OU soft-deleted
          where.OR = [{ status: 'inativo', deleted_at: null }, { deleted_at: { not: null } }];
        } else {
          // Se nenhum status fornecido (filtro "Todos"), mostrar todos os clientes não deletados
          // E também clientes com status inativo que foram soft-deleted
          where.OR = [
            { deleted_at: null }, // Todos os não deletados (ativos e inativos)
            { status: 'inativo', deleted_at: { not: null } }, // Inativos que foram soft-deleted
          ];
        }
      }

      // Filtrar por termo de busca se fornecido
      if (search) {
        // Precisamos preservar a condição OR existente para status inativo
        const searchConditions = [
          { razao_social: { contains: search } },
          { nome_fantasia: { contains: search } },
          { cnpj: { contains: search } },
        ];

        if (where.OR) {
          // Se já temos condições OR (para status inativo), precisamos combinar com a busca
          const statusConditions = where.OR;
          // Remover a condição OR existente
          delete where.OR;

          // Criar uma nova condição AND que combina as condições de status com a busca
          where.AND = [{ OR: statusConditions }, { OR: searchConditions }];
        } else {
          // Caso contrário, apenas adicionar as condições de busca
          where.OR = searchConditions;
        }
      }

      debugLog('ClientesService', 'Filtros aplicados:', where);

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

      debugLog('ClientesService', 'findAll - dados retornados:', {
        data: items.length,
        meta: {
          page,
          limit,
          itemCount: total,
          pageCount,
          hasPreviousPage,
          hasNextPage,
        },
      });

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
      this.logger.error(`Error in findAll: ${error}`);
      throw new BadRequestException('Erro ao buscar clientes');
    }
  }

  async findOne(id: number, includeDeleted: boolean = false, tenant?: TenantContext) {
    try {
      // Tenant isolation: CLIENTE users can only see their own company
      if (tenant?.clienteId && id !== tenant.clienteId) {
        throw new ForbiddenException('Acesso negado a este cliente');
      }

      // Construir condição de busca
      const where: Prisma.ClienteWhereInput = { id };

      // Se não deve incluir clientes excluídos, adicionar filtro
      if (!includeDeleted) {
        where.deleted_at = null;
      }

      debugLog(
        'ClientesService',
        `Buscando cliente com ID ${id}, includeDeleted=${includeDeleted}`,
      );

      const cliente = await this.prisma.cliente.findFirst({
        where,
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
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar cliente');
    }
  }

  // =========================================================================
  // APROVAÇÃO / REJEIÇÃO DE AUTO-CADASTRO
  // =========================================================================

  /**
   * Aprova um cliente pendente: status → ativo, usuarios vinculados → ativo.
   * Envia email de notificação aos usuários do cliente.
   */
  async aprovarCliente(id: number) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }
    if (cliente.status !== 'pendente_aprovacao') {
      throw new BadRequestException('Cliente não está pendente de aprovação');
    }

    // Transação: ativar cliente + ativar usuarios vinculados
    await this.prisma.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id },
        data: { status: 'ativo' },
      });
      await tx.usuario.updateMany({
        where: { cliente_id: id },
        data: { status: 'ativo' },
      });
    });

    // Enviar email de aprovação (fire-and-forget)
    const usuarios = await this.prisma.usuario.findMany({
      where: { cliente_id: id },
    });
    for (const u of usuarios) {
      this.emailService
        .enviarEmail({
          to: u.email,
          subject: "Cadastro aprovado — Lino's Panificadora",
          text: `Olá ${u.nome}, seu cadastro para ${cliente.razao_social} foi aprovado! Você já pode acessar o portal.`,
        })
        .catch((err) =>
          this.logger.error(`Erro ao enviar email de aprovação para ${u.email}: ${err.message}`),
        );
    }

    this.logger.log(`Cliente aprovado: id=${id}, razao_social=${cliente.razao_social}`);
    return { message: 'Cliente aprovado com sucesso' };
  }

  /**
   * Rejeita um cliente pendente: status → rejeitado, usuarios permanecem inativos.
   * Envia email de rejeição (com motivo opcional).
   */
  async rejeitarCliente(id: number, motivo?: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }
    if (cliente.status !== 'pendente_aprovacao') {
      throw new BadRequestException('Cliente não está pendente de aprovação');
    }

    await this.prisma.cliente.update({
      where: { id },
      data: { status: 'rejeitado' },
    });

    // Enviar email de rejeição (fire-and-forget)
    const usuarios = await this.prisma.usuario.findMany({
      where: { cliente_id: id },
    });
    for (const u of usuarios) {
      const motivoTexto = motivo
        ? `\nMotivo: ${motivo}`
        : '';
      this.emailService
        .enviarEmail({
          to: u.email,
          subject: "Cadastro não aprovado — Lino's Panificadora",
          text: `Olá ${u.nome}, infelizmente seu cadastro para ${cliente.razao_social} não foi aprovado.${motivoTexto}\nSe tiver dúvidas, entre em contato com nosso suporte.`,
        })
        .catch((err) =>
          this.logger.error(`Erro ao enviar email de rejeição para ${u.email}: ${err.message}`),
        );
    }

    this.logger.log(`Cliente rejeitado: id=${id}, razao_social=${cliente.razao_social}${motivo ? `, motivo=${motivo}` : ''}`);
    return { message: 'Cliente rejeitado' };
  }
}
