import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto, UsuarioResponseDto } from './dto/usuario.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissoesGuard } from '../auth/guards/permissoes.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequerPermissoes } from '../auth/decorators/requer-permissoes.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import {
  PAPEL_ADMIN_SISTEMA,
  PAPEL_GERENTE_COMERCIAL,
  PAPEL_CLIENTE_ADMIN,
} from '../auth/roles.constants';

@SkipThrottle()
@ApiTags('Usuários')
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard, PermissoesGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(PAPEL_ADMIN_SISTEMA, PAPEL_GERENTE_COMERCIAL, PAPEL_CLIENTE_ADMIN)
  @RequerPermissoes('usuarios:criar')
  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso', type: UsuarioResponseDto })
  @ApiResponse({ status: 400, description: 'Requisição inválida' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @RequerPermissoes('usuarios:listar')
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    type: [UsuarioResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get('papeis')
  @RequerPermissoes('papeis:listar')
  @ApiOperation({ summary: 'Listar todos os papéis (roles)' })
  @ApiResponse({ status: 200, description: 'Lista de papéis retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findPapeis() {
    return this.usuariosService.findPapeis();
  }

  @Get(':id')
  @RequerPermissoes('usuarios:ver')
  @ApiOperation({ summary: 'Buscar um usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado', type: UsuarioResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Patch(':id')
  @RequerPermissoes('usuarios:editar')
  @ApiOperation({ summary: 'Atualizar um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso',
    type: UsuarioResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado para outro usuário' })
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(+id, updateUsuarioDto);
  }

  @Delete(':id')
  @Roles(PAPEL_ADMIN_SISTEMA)
  @RequerPermissoes('usuarios:deletar')
  @ApiOperation({ summary: 'Remover um usuário (soft delete)' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(+id);
  }
}
