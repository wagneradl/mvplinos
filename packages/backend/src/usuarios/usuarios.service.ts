import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

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

    // Hash da senha
    const hashSenha = await bcrypt.hash(createUsuarioDto.senha, 10);

    // Criar usuário
    const usuarioCriado = await this.prisma.usuario.create({
      data: {
        ...createUsuarioDto,
        senha: hashSenha,
      },
      include: {
        papel: true,
      },
    });

    // Transformar o formato das permissões para o retorno
    const permissoes = JSON.parse(usuarioCriado.papel.permissoes);

    // Remover a senha do retorno
    const { senha, ...usuario } = usuarioCriado;
    return {
      ...usuario,
      papel: {
        ...usuario.papel,
        permissoes,
      },
    };
  }

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        papel: true,
      },
    });

    // Mapear os usuários para remover a senha e processar permissões
    return usuarios.map(usuario => {
      const { senha, ...usuarioSemSenha } = usuario;
      const permissoes = JSON.parse(usuario.papel.permissoes);
      
      return {
        ...usuarioSemSenha,
        papel: {
          ...usuario.papel,
          permissoes,
        },
      };
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        papel: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Transformar o formato das permissões
    const permissoes = JSON.parse(usuario.papel.permissoes);

    // Remover a senha do retorno
    const { senha, ...usuarioSemSenha } = usuario;
    return {
      ...usuarioSemSenha,
      papel: {
        ...usuario.papel,
        permissoes,
      },
    };
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    // Verificar se o usuário existe
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
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

    // Se houver papel_id, verificar se o papel existe
    if (updateUsuarioDto.papel_id) {
      const papel = await this.prisma.papel.findUnique({
        where: { id: updateUsuarioDto.papel_id },
      });

      if (!papel) {
        throw new NotFoundException(`Papel com ID ${updateUsuarioDto.papel_id} não encontrado`);
      }
    }

    // Preparar os dados para atualização
    const data: any = { ...updateUsuarioDto };

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
      },
    });

    // Transformar o formato das permissões
    const permissoes = JSON.parse(usuarioAtualizado.papel.permissoes);

    // Remover a senha do retorno
    const { senha, ...usuario } = usuarioAtualizado;
    return {
      ...usuario,
      papel: {
        ...usuario.papel,
        permissoes,
      },
    };
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
    return papeis.map(papel => {
      const permissoes = JSON.parse(papel.permissoes);
      return {
        ...papel,
        permissoes,
      };
    });
  }
}
