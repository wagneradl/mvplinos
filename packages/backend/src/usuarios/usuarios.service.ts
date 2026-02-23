import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuario.dto';
import * as bcrypt from 'bcryptjs';

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

  async create(createUsuarioDto: CreateUsuarioDto) {
    // Verificar se já existe um usuário com o mesmo email
    const emailExistente = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (emailExistente) {
      throw new ConflictException('E-mail já cadastrado');
    }

    // Verificar se o papel existe
    const papel = await this.prisma.papel.findUnique({
      where: { id: createUsuarioDto.papel_id },
    });

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

  async findAll(clienteId?: number) {
    const where: any = { deleted_at: null };
    if (clienteId) {
      where.cliente_id = clienteId;
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

  async findOne(id: number) {
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

    return this.formatarRetorno(usuario);
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    // Verificar se o usuário existe
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
      include: { papel: true },
    });

    if (!usuarioExistente) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
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
      const novoPapel = await this.prisma.papel.findUnique({
        where: { id: updateUsuarioDto.papel_id },
      });

      if (!novoPapel) {
        throw new NotFoundException(`Papel com ID ${updateUsuarioDto.papel_id} não encontrado`);
      }
      papelEfetivo = novoPapel;
    }

    // Determinar o cliente_id efetivo
    // Se cliente_id é explicitamente passado (mesmo null), usar o valor passado
    // Se não passado, manter o existente
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

  async remove(id: number) {
    // Verificar se o usuário existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
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

  async findPapeis() {
    const papeis = await this.prisma.papel.findMany();

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
