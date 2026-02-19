import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissoesGuard } from '../auth/guards/permissoes.guard';
import { RequerPermissoes } from '../auth/decorators/requer-permissoes.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@ApiTags('produtos')
@Controller('produtos')
@UseGuards(JwtAuthGuard, PermissoesGuard)
@ApiBearerAuth()
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Post()
  @RequerPermissoes('produtos:criar')
  @ApiOperation({ summary: 'Criar novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async create(@Body() createProdutoDto: CreateProdutoDto) {
    try {
      // Validações adicionais
      if (!createProdutoDto.nome?.trim()) {
        throw new BadRequestException('Nome do produto é obrigatório');
      }

      if (
        typeof createProdutoDto.preco_unitario !== 'number' ||
        isNaN(createProdutoDto.preco_unitario)
      ) {
        throw new BadRequestException('Preço unitário inválido');
      }

      if (!['un', 'kg', 'lt'].includes(createProdutoDto.tipo_medida)) {
        throw new BadRequestException('Tipo de medida inválido');
      }

      if (!['ativo', 'inativo'].includes(createProdutoDto.status)) {
        throw new BadRequestException('Status inválido');
      }

      const result = await this.produtosService.create(createProdutoDto);
      return result;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar produto';

      throw new BadRequestException(errorMessage);
    }
  }

  @Get()
  @RequerPermissoes('produtos:listar')
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiQuery({ type: PageOptionsDto })
  findAll(@Query() pageOptions: PageOptionsDto) {
    return this.produtosService.findAll(pageOptions);
  }

  @Get(':id')
  @RequerPermissoes('produtos:ver')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Incluir produtos excluídos',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.produtosService.findOne(id, includeDeleted === true);
  }

  @Patch(':id')
  @RequerPermissoes('produtos:editar')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Incluir produtos excluídos',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProdutoDto: UpdateProdutoDto,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    try {
      // Validações para campos que estão sendo atualizados
      if (updateProdutoDto.nome !== undefined && !updateProdutoDto.nome?.trim()) {
        throw new BadRequestException('Nome do produto não pode ser vazio');
      }

      if (
        updateProdutoDto.preco_unitario !== undefined &&
        (typeof updateProdutoDto.preco_unitario !== 'number' ||
          isNaN(updateProdutoDto.preco_unitario))
      ) {
        throw new BadRequestException('Preço unitário inválido');
      }

      if (
        updateProdutoDto.tipo_medida !== undefined &&
        !['un', 'kg', 'lt'].includes(updateProdutoDto.tipo_medida)
      ) {
        throw new BadRequestException('Tipo de medida inválido');
      }

      if (
        updateProdutoDto.status !== undefined &&
        !['ativo', 'inativo'].includes(updateProdutoDto.status)
      ) {
        throw new BadRequestException('Status inválido');
      }

      const result = await this.produtosService.update(
        id,
        updateProdutoDto,
        includeDeleted === true,
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar produto';

      throw new BadRequestException(errorMessage);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequerPermissoes('produtos:desativar')
  @ApiOperation({ summary: 'Remover produto' })
  @ApiResponse({ status: 200, description: 'Produto removido' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.produtosService.remove(id);
  }
}
