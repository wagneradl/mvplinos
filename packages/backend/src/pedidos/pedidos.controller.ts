import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
import { Response } from 'express';
import { ParseIntPipe, ParseFloatPipe } from '@nestjs/common';

@ApiTags('pedidos')
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  create(@Body() createPedidoDto: CreatePedidoDto) {
    return this.pedidosService.create(createPedidoDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar todos os pedidos',
    description: 'Lista pedidos com suporte a filtros por data e cliente, além de paginação'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de pedidos retornada com metadados de paginação.' 
  })
  findAll(@Query() filterDto: FilterPedidoDto) {
    return this.pedidosService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  @ApiResponse({ status: 200, description: 'Pedido encontrado.' })
  findOne(@Param('id') id: string) {
    return this.pedidosService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar pedido' })
  @ApiResponse({ status: 200, description: 'Pedido atualizado.' })
  update(@Param('id') id: string, @Body() updatePedidoDto: UpdatePedidoDto) {
    return this.pedidosService.update(+id, updatePedidoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover pedido (soft delete)' })
  @ApiResponse({ status: 200, description: 'Pedido removido.' })
  remove(@Param('id') id: string) {
    return this.pedidosService.remove(+id);
  }

  @Post(':id/repeat')
  @ApiOperation({ summary: 'Repetir pedido existente' })
  @ApiResponse({ status: 201, description: 'Novo pedido criado baseado no original.' })
  repeat(@Param('id') id: string) {
    return this.pedidosService.repeat(+id);
  }

  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Download do PDF do pedido',
    description: 'Faz o download do arquivo PDF associado ao pedido especificado.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: 'number',
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'PDF do pedido retornado com sucesso',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Pedido não encontrado ou PDF não disponível'
  })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const pdfPath = await this.pedidosService.getPdfPath(id);
    return res.sendFile(pdfPath);
  }

  @Patch(':id/itens/:itemId')
  @ApiOperation({ summary: 'Atualizar quantidade de um item do pedido' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiParam({ name: 'itemId', description: 'ID do item do pedido' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantidade: {
          type: 'number',
          description: 'Nova quantidade do item',
          example: 2
        }
      }
    }
  })
  async updateItemQuantidade(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('quantidade', ParseFloatPipe) quantidade: number
  ) {
    return this.pedidosService.updateItemQuantidade(id, itemId, quantidade);
  }
}
