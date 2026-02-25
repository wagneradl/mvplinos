import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  Req,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientesService, TenantContext } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissoesGuard } from '../auth/guards/permissoes.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RequerPermissoes } from '../auth/decorators/requer-permissoes.decorator';
import { UsuarioAutenticado } from '../auth/interfaces/usuario-autenticado.interface';
import { debugLog } from '../common/utils/debug-log';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle({ login: true, reset: true })
@ApiTags('clientes')
@Controller('clientes')
@UseGuards(JwtAuthGuard, TenantGuard, PermissoesGuard)
@ApiBearerAuth()
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  private extractTenant(req: Request): TenantContext {
    const user = (req as any).user as UsuarioAutenticado;
    return {
      userId: user.id,
      clienteId: (req as any).clienteId ?? null,
    };
  }

  @Post()
  @RequerPermissoes('clientes:criar')
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado.' })
  create(@Body() createClienteDto: CreateClienteDto) {
    debugLog('ClientesController', 'Recebeu createClienteDto:', createClienteDto);
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @RequerPermissoes('clientes:listar')
  @ApiOperation({ summary: 'Listar todos os clientes' })
  @ApiResponse({ status: 200, description: 'Lista de clientes retornada com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'status', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'includeDeleted', type: Boolean, required: false })
  async findAll(
    @Req() req: Request,
    @Query(new ValidationPipe({ transform: true })) pageOptions: PageOptionsDto,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    // Passar o parâmetro includeDeleted e tenant context para o serviço
    return this.clientesService.findAll(pageOptions, includeDeleted, this.extractTenant(req));
  }

  @Get('cnpj/:cnpj')
  @RequerPermissoes('clientes:ver')
  @ApiOperation({ summary: 'Buscar cliente por CNPJ' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  findByCnpj(@Param('cnpj') cnpj: string) {
    return this.clientesService.findByCnpj(cnpj);
  }

  @Get(':id')
  @RequerPermissoes('clientes:ver')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  @ApiQuery({ name: 'includeDeleted', type: Boolean, required: false })
  findOne(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.clientesService.findOne(id, includeDeleted, this.extractTenant(req));
  }

  @Patch(':id')
  @RequerPermissoes('clientes:editar')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado.' })
  @ApiQuery({ name: 'includeDeleted', type: Boolean, required: false })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.clientesService.update(id, updateClienteDto, includeDeleted);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequerPermissoes('clientes:desativar')
  @ApiOperation({ summary: 'Remover cliente' })
  @ApiResponse({ status: 200, description: 'Cliente removido com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }

  // =========================================================================
  // APROVAÇÃO / REJEIÇÃO DE AUTO-CADASTRO
  // =========================================================================

  @Patch(':id/aprovar')
  @RequerPermissoes('clientes:editar')
  @ApiOperation({ summary: 'Aprovar cadastro de cliente pendente' })
  @ApiResponse({ status: 200, description: 'Cliente aprovado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Cliente não está pendente de aprovação.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  aprovarCliente(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.aprovarCliente(id);
  }

  @Patch(':id/rejeitar')
  @RequerPermissoes('clientes:editar')
  @ApiOperation({ summary: 'Rejeitar cadastro de cliente pendente' })
  @ApiResponse({ status: 200, description: 'Cliente rejeitado.' })
  @ApiResponse({ status: 400, description: 'Cliente não está pendente de aprovação.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  rejeitarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
  ) {
    return this.clientesService.rejeitarCliente(id, motivo);
  }
}
