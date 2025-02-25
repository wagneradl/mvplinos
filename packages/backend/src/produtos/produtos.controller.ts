import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('produtos')
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createProdutoDto: CreateProdutoDto) {
    try {
      // Validações adicionais
      if (!createProdutoDto.nome?.trim()) {
        throw new BadRequestException('Nome do produto é obrigatório');
      }

      if (typeof createProdutoDto.preco_unitario !== 'number' || isNaN(createProdutoDto.preco_unitario)) {
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

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro ao criar produto';

      throw new BadRequestException(errorMessage);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  @ApiQuery({ type: PageOptionsDto })
  findAll(@Query() pageOptions: PageOptionsDto) {
    return this.produtosService.findAll(pageOptions);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.produtosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProdutoDto: UpdateProdutoDto,
  ) {
    try {
      // Validações para campos que estão sendo atualizados
      if (updateProdutoDto.nome !== undefined && !updateProdutoDto.nome?.trim()) {
        throw new BadRequestException('Nome do produto não pode ser vazio');
      }

      if (updateProdutoDto.preco_unitario !== undefined && 
         (typeof updateProdutoDto.preco_unitario !== 'number' || isNaN(updateProdutoDto.preco_unitario))) {
        throw new BadRequestException('Preço unitário inválido');
      }

      if (updateProdutoDto.tipo_medida !== undefined && 
         !['un', 'kg', 'lt'].includes(updateProdutoDto.tipo_medida)) {
        throw new BadRequestException('Tipo de medida inválido');
      }

      if (updateProdutoDto.status !== undefined && 
         !['ativo', 'inativo'].includes(updateProdutoDto.status)) {
        throw new BadRequestException('Status inválido');
      }

      const result = await this.produtosService.update(id, updateProdutoDto);
      return result;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro ao atualizar produto';

      throw new BadRequestException(errorMessage);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover produto' })
  @ApiResponse({ status: 200, description: 'Produto removido' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.produtosService.remove(id);
  }
}