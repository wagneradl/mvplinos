import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuario.dto';
import * as bcrypt from 'bcryptjs';

/** Contexto do caller para operações de criação/edição */
export interface CallerContext {
  clienteId: number;
  papelNivel: number;
}

/** Contexto do caller para operações de remoção */
export interface RemoveCallerContext {
  clienteId: number;
  callerId: number;
}

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valida a consistência entre tipo do papel e cliente_id.
   * - Papel CLIENTE → cliente_id obrigatório, cliente deve existir e estar ativo
   * - Papel INTERNO → cliente_id deve ser null
   */
  private async validarVinculoCliente(
    papel: { tipo: string },
    clienteId: number | null | undefined,
  ): Promise<void> {
    if (papel.tipo === 'CLIENTE') {
      if (!clienteId) {
        throw new BadRequestException(
          'Usuários com papel do tipo CLIENTE devem estar vinculados a um cliente',
        );
      }
      // Verificar se o cliente existe e está ativo
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: clienteId },
      });
      if (!cliente) {
        throw new NotFoundException(`Cliente com ID ${clienteId} não encontrado`);
      }
      if (cliente.status !== 'ativo' || cliente.deleted_at) {
        throw new BadRequestException(
          `Cliente com ID ${clienteId} está inativo ou foi removido`,
        );
      }
    } else if (papel.tipo === 'INTERNO') {
      if (clienteId) {
        throw new BadRequestException(
          'Usuários com papel do tipo INTERNO não podem estar vinculados a um cliente',
        );
      }
    }
  }

  /**
   * Helper para formatar retorno (remove senha, parseia permissões)
   */
  private formatarRetorno(usuario: any) {
    const permissoes = JSON.parse(usuario.papel.permissoes);
    const { senha: _senha, ...usuarioSemSenha } = usuario;
    return {
      ...usuarioSemSenha,
      papel: {
        ...usuario.papel,
        permissoes,
      },
    };
  }

  async create(createUsuarioDto: CreateUsuarioDto, callerContext?: CallerContext) {
    // ── Tenant isolation: CLIENTE_ADMIN restrictions ──
    if (callerContext?.clienteId) {
      // Forçar cliente_id do caller (ignorar valor do body)
      createUsuarioDto.cliente_id = callerContext.clienteId;

      // Verificar que o papel destino é CLIENTE e nível menor que o caller
      const papelDestino = await this.prisma.papel.findUnique({
        where: { id: createUsuarioDto.papel_id },
      });
      if (!papelDestino) {
        throw new NotFoundException(`Papel com ID ${createUsuarioDto.papel_id} não encontrado`);
      }
      if (papelDestino.tipo !== 'CLIENTE' || papelDestino.nivel >= callerContext.papelNivel) {
        throw new ForbiddenException('Sem permissão para criar usuários com este papel');
      }
    }

    // Verificar se já existe um usuário com o mesmo email
    const emailExistente = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (emailExistente) {
      throw new ConflictException('E-mail já cadastrado');
    }

    // Verificar se o papel existe (pode já ter sido buscado acima)
    const papel = callerContext?.clienteId
      ? await this.prisma.papel.findUnique({ where: { id: createUsuarioDto.papel_id } })
      : await this.prisma.papel.findUnique({ where: { id: createUsuarioDto.papel_id } });

    if (!papel) {
      throw new NotFoundException(`Papel com ID ${createUsuarioDto.papel_id} não encontrado`);
    }

    // Validar consistência papel × cliente
    await this.validarVinculoCliente(papel, createUsuarioDto.cliente_id ?? null);

    // Hash da senha
    const hashSenha = await bcrypt.hash(createUsuarioDto.senha, 10);

    // Montar dados (excluir cliente_id undefined para não enviar ao Prisma)
    const { cliente_id, ...restDto } = createUsuarioDto;
    const data: any = {
      ...restDto,
      senha: hashSenha,
    };
    if (cliente_id) {
      data.cliente_id = cliente_id;
    }

    // Criar usuário
    const usuarioCriado = await this.prisma.usuario.create({
      data,
      include: {
        papel: true,
        cliente: true,
      },
    });

    return this.formatarRetorno(usuarioCriado);
  }

  async findAll(clienteId?: number, callerClienteId?: number) {
    // Tenant isolation: caller CLIENTE sempre vê apenas seu próprio cliente
    const effectiveClienteId = callerClienteId || clienteId;

    const where: any = { deleted_at: null };
    if (effectiveClienteId) {
      where.cliente_id = effectiveClienteId;
    }

    const usuarios = await this.prisma.usuario.findMany({
      where,
      include: {
        papel: true,
        cliente: true,
      },
    });

    return usuarios.map((usuario) => this.formatarRetorno(usuario));
  }

  async findOne(id: number, callerClienteId?: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        papel: true,
        cliente: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Tenant isolation: caller CLIENTE só pode ver usuários do seu cliente
    if (callerClienteId && usuario.cliente_id !== callerClienteId) {
      throw new ForbiddenException('Acesso negado a este usuário');
    }

    return this.formatarRetorno(usuario);
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto, callerContext?: CallerContext) {
    // Verificar se o usuário existe
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
      include: { papel: true },
    });

    if (!usuarioExistente) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // ── Tenant isolation: CLIENTE_ADMIN restrictions ──
    if (callerContext?.clienteId) {
      // Verificar que o usuário pertence ao mesmo cliente
      if (usuarioExistente.cliente_id !== callerContext.clienteId) {
        throw new ForbiddenException('Acesso negado a este usuário');
      }

      // Se tentar mudar o papel, validar que o novo papel é CLIENTE e nível menor
      if (updateUsuarioDto.papel_id) {
        const novoPapel = await this.prisma.papel.findUnique({
          where: { id: updateUsuarioDto.papel_id },
        });
        if (!novoPapel) {
          throw new NotFoundException(`Papel com ID ${updateUsuarioDto.papel_id} não encontrado`);
        }
        if (novoPapel.tipo !== 'CLIENTE' || novoPapel.nivel >= callerContext.papelNivel) {
          throw new ForbiddenException('Sem permissão para atribuir este papel');
        }
      }

      // Forçar cliente_id (não pode mover para outro cliente)
      delete updateUsuarioDto.cliente_id;
    }

    // Se houver atualização de email, verificar se já existe
    if (updateUsuarioDto.email && updateUsuarioDto.email !== usuarioExistente.email) {
      const emailExistente = await this.prisma.usuario.findUnique({
        where: { email: updateUsuarioDto.email },
      });

      if (emailExistente) {
        throw new ConflictException('E-mail já cadastrado para outro usuário');
      }
    }

    // Determinar o papel efetivo (novo ou existente)
    let papelEfetivo = usuarioExistente.papel;
    if (updateUsuarioDto.papel_id) {
      // Se callerContext era presente, o papel já foi validado acima
      const novoPapel = await this.prisma.papel.findUnique({
        where: { id: updateUsuarioDto.papel_id },
      });

      if (!novoPapel) {
        throw new NotFoundException(`Papel com ID ${updateUsuarioDto.papel_id} não encontrado`);
      }
      papelEfetivo = novoPapel;
    }

    // Determinar o cliente_id efetivo
    const clienteIdExplicit = 'cliente_id' in updateUsuarioDto;
    let clienteIdEfetivo: number | null;

    if (clienteIdExplicit) {
      clienteIdEfetivo = updateUsuarioDto.cliente_id ?? null;
    } else {
      clienteIdEfetivo = usuarioExistente.cliente_id;
    }

    // Se mudou de CLIENTE para INTERNO, limpar cliente_id automaticamente
    if (
      usuarioExistente.papel.tipo === 'CLIENTE' &&
      papelEfetivo.tipo === 'INTERNO'
    ) {
      clienteIdEfetivo = null;
    }

    // Validar consistência papel × cliente
    await this.validarVinculoCliente(papelEfetivo, clienteIdEfetivo);

    // Preparar os dados para atualização
    const { cliente_id: _clienteId, ...restDto } = updateUsuarioDto;
    const data: any = { ...restDto };

    // Sempre setar cliente_id no update para garantir consistência
    data.cliente_id = clienteIdEfetivo;

    // Se houver senha, fazer o hash
    if (updateUsuarioDto.senha) {
      data.senha = await bcrypt.hash(updateUsuarioDto.senha, 10);
    }

    // Atualizar usuário
    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data,
      include: {
        papel: true,
        cliente: true,
      },
    });

    return this.formatarRetorno(usuarioAtualizado);
  }

  async remove(id: number, callerContext?: RemoveCallerContext) {
    // Verificar se o usuário existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { papel: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // ── Tenant isolation: CLIENTE_ADMIN restrictions ──
    if (callerContext?.clienteId) {
      // Verificar que o usuário pertence ao mesmo cliente
      if (usuario.cliente_id !== callerContext.clienteId) {
        throw new ForbiddenException('Acesso negado a este usuário');
      }

      // Não pode desativar a si mesmo
      if (usuario.id === callerContext.callerId) {
        throw new BadRequestException('Não é possível desativar sua própria conta');
      }

      // Não pode desativar outro CLIENTE_ADMIN (apenas CLIENTE_USUARIO)
      if (usuario.papel.codigo === 'CLIENTE_ADMIN') {
        throw new ForbiddenException('Sem permissão para desativar administradores');
      }
    }

    // Soft delete (marcar como deletado)
    return this.prisma.usuario.update({
      where: { id },
      data: {
        status: 'inativo',
        deleted_at: new Date(),
      },
    });
  }

  async findPapeis(tipo?: string) {
    const where: any = {};
    if (tipo) {
      where.tipo = tipo;
    }

    const papeis = await this.prisma.papel.findMany({ where });

    // Processar permissões para cada papel
    return papeis.map((papel) => {
      const permissoes = JSON.parse(papel.permissoes);
      return {
        ...papel,
        permissoes,
      };
    });
  }
}
