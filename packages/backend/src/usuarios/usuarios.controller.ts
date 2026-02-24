import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto, UsuarioResponseDto } from './dto/usuario.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissoesGuard } from '../auth/guards/permissoes.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequerPermissoes } from '../auth/decorators/requer-permissoes.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { UsuarioAutenticado } from '../auth/interfaces/usuario-autenticado.interface';
import {
  PAPEL_ADMIN_SISTEMA,
  PAPEL_GERENTE_COMERCIAL,
  PAPEL_CLIENTE_ADMIN,
} from '../auth/roles.constants';

/** Extrai contexto do caller (clienteId + papel nivel) a partir do request */
interface CallerContext {
  clienteId: number | null;
  papelNivel: number;
  callerId: number;
}

@SkipThrottle()
@ApiTags('Usuários')
@Controller('usuarios')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissoesGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  private extractCaller(req: Request): CallerContext {
    const user = (req as any).user as UsuarioAutenticado;
    return {
      clienteId: (req as any).clienteId ?? null,
      papelNivel: user.papel.nivel,
      callerId: user.id,
    };
  }

  @Post()
  @Roles(PAPEL_ADMIN_SISTEMA, PAPEL_GERENTE_COMERCIAL, PAPEL_CLIENTE_ADMIN)
  @RequerPermissoes('usuarios:criar')
  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso', type: UsuarioResponseDto })
  @ApiResponse({ status: 400, description: 'Requisição inválida' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  create(@Body() createUsuarioDto: CreateUsuarioDto, @Req() req: Request) {
    const caller = this.extractCaller(req);
    return this.usuariosService.create(
      createUsuarioDto,
      caller.clienteId ? { clienteId: caller.clienteId, papelNivel: caller.papelNivel } : undefined,
    );
  }

  @Get()
  @RequerPermissoes('usuarios:listar')
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiQuery({ name: 'cliente_id', required: false, type: Number, description: 'Filtrar por cliente' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    type: [UsuarioResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findAll(@Query('cliente_id') clienteId?: string, @Req() req?: Request) {
    const caller = this.extractCaller(req);
    return this.usuariosService.findAll(
      clienteId ? +clienteId : undefined,
      caller.clienteId ?? undefined,
    );
  }

  @Get('papeis')
  @RequerPermissoes('papeis:listar')
  @ApiOperation({ summary: 'Listar todos os papéis (roles)' })
  @ApiQuery({ name: 'tipo', required: false, type: String, description: 'Filtrar por tipo (INTERNO ou CLIENTE)' })
  @ApiResponse({ status: 200, description: 'Lista de papéis retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findPapeis(@Query('tipo') tipo?: string) {
    return this.usuariosService.findPapeis(tipo);
  }

  @Get(':id')
  @RequerPermissoes('usuarios:ver')
  @ApiOperation({ summary: 'Buscar um usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado', type: UsuarioResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const caller = this.extractCaller(req);
    return this.usuariosService.findOne(+id, caller.clienteId ?? undefined);
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
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto, @Req() req: Request) {
    const caller = this.extractCaller(req);
    return this.usuariosService.update(
      +id,
      updateUsuarioDto,
      caller.clienteId ? { clienteId: caller.clienteId, papelNivel: caller.papelNivel } : undefined,
    );
  }

  @Delete(':id')
  @Roles(PAPEL_ADMIN_SISTEMA, PAPEL_CLIENTE_ADMIN)
  @RequerPermissoes('usuarios:desativar')
  @ApiOperation({ summary: 'Remover um usuário (soft delete)' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  remove(@Param('id') id: string, @Req() req: Request) {
    const caller = this.extractCaller(req);
    return this.usuariosService.remove(
      +id,
      caller.clienteId
        ? { clienteId: caller.clienteId, callerId: caller.callerId }
        : undefined,
    );
  }
}
