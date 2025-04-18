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
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
import { ReportPedidoDto } from './dto/report-pedido.dto';
import { Response } from 'express';
import { ParseIntPipe, ParseFloatPipe } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Req } from '@nestjs/common';

@ApiTags('pedidos')
@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  create(@Body() createPedidoDto: CreatePedidoDto) {
    console.log('Controller recebeu createPedidoDto:', createPedidoDto);
    return this.pedidosService.create(createPedidoDto);
  }

  @Get('reports/summary')
  @ApiOperation({ 
    summary: 'Gerar relatório de pedidos',
    description: 'Gera relatório de pedidos com agrupamento por período e filtros'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Relatório gerado com sucesso.' 
  })
  async generateReport(@Query() reportDto: ReportPedidoDto) {
    return this.pedidosService.generateReport(reportDto);
  }

  @Get('reports/pdf')
  @ApiOperation({
    summary: 'Gerar PDF de relatório de pedidos',
    description: 'Gera um arquivo PDF com o relatório de pedidos para o período especificado'
  })
  @ApiResponse({
    status: 200,
    description: 'PDF do relatório gerado com sucesso',
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
    status: 400,
    description: 'Parâmetros inválidos ou erro ao gerar o relatório'
  })
  async generateReportPdf(
    @Query('data_inicio') data_inicio: string,
    @Query('data_fim') data_fim: string,
    @Query('cliente_id') cliente_id: number,
    @Res() res: Response,
    @Req() req: any
  ) {
    try {
      const reportDto: ReportPedidoDto = { data_inicio, data_fim, cliente_id };
      console.log('Recebendo requisição para gerar PDF com parâmetros:', reportDto);
      const pdfResult = await this.pedidosService.generateReportPdf(reportDto);
      if (typeof pdfResult === 'string') {
        // Local file path
        if (!existsSync(pdfResult)) {
          console.error(`Arquivo PDF não encontrado: ${pdfResult}`);
          throw new NotFoundException('PDF não encontrado');
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.sendFile(pdfResult);
        return;
      } else {
        // Supabase: retorna objeto { path, url }
        // NOVO: gerar signed URL para o relatório
        console.log(`[DEBUG] (Relatório) pdfResult.path: ${pdfResult.path}`);
        const signedUrl = await this.supabaseService.getSignedUrl(pdfResult.path, 300); // 5 minutos
        console.log(`[DEBUG] (Relatório) signedUrl: ${signedUrl}`);
        if (!signedUrl) {
          console.error('[DEBUG] (Relatório) Falha ao gerar signed URL!');
          throw new InternalServerErrorException('Falha ao gerar link seguro para o PDF do relatório');
        }
        console.log('[DEBUG] (Relatório) Respondendo JSON com signedUrl');
        return res.json({
          url: signedUrl,
          path: pdfResult.path
        });
      }
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório:', error instanceof Error ? error.message : error);
      if (error instanceof BadRequestException) {
        // Loga o corpo da exceção se disponível
        if (error.getResponse) {
          console.error('BadRequestException response:', error.getResponse());
        }
        throw error;
      }
      // Loga stacktrace para erros desconhecidos
      if (error instanceof Error && error.stack) {
        console.error('Stacktrace:', error.stack);
      }
      throw new BadRequestException('Erro ao gerar PDF do relatório');
    }
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
    console.log('Controller recebeu request para listar pedidos com filtros:', filterDto);
    
    // Log detalhado para troubleshooting do filtro de datas
    if (filterDto.startDate && filterDto.endDate) {
      console.log(`Controller: Filtrando pedidos de ${filterDto.startDate} até ${filterDto.endDate}`);
    }
    
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'operador')
  @ApiOperation({ summary: 'Download do PDF de um pedido' })
  @ApiResponse({ status: 200, description: 'Retorna o arquivo PDF' })
  @ApiResponse({ status: 400, description: 'Pedido inválido ou PDF não disponível' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  async downloadPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: any) {
    try {
      // LOG: Usuário autenticado e roles
      console.log('[DEBUG] downloadPdf - req.user:', req.user);
      // Buscar pedido pelo ID para obter o caminho ou URL do PDF
      const pedido = await this.pedidosService.findOne(id);
      
      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }
      
      // Verificar se o pedido tem PDF
      if (!pedido.pdf_path && !pedido.pdf_url) {
        throw new NotFoundException(`PDF não encontrado para o pedido ${id}`);
      }
      
      // Caso PDF esteja salvo localmente
      if (pedido.pdf_path && existsSync(pedido.pdf_path)) {
        console.log('[DEBUG] downloadPdf - Servindo arquivo local:', pedido.pdf_path);
        // Corrige: converte caminho relativo para absoluto
        const absolutePath = join(process.cwd(), pedido.pdf_path);
        return res.sendFile(absolutePath);
      }
      // Caso PDF esteja no Supabase
      if (pedido.pdf_url && pedido.pdf_url.includes('supabase.co')) {
        try {
          console.log('[DEBUG] downloadPdf - Tentando baixar do Supabase:', pedido.pdf_path);
          const supabaseResponse = await this.supabaseService.downloadFile(pedido.pdf_path);
          if (!supabaseResponse || !supabaseResponse.data) {
            console.log('[DEBUG] downloadPdf - PDF não encontrado no Supabase');
            throw new NotFoundException('PDF não encontrado no Supabase');
          }
          const arrayBuffer = await supabaseResponse.data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.setHeader('Content-Type', 'application/pdf');
          console.log('[DEBUG] downloadPdf - PDF baixado do Supabase com sucesso');
          return res.send(buffer);
        } catch (supabaseError) {
          console.log('[DEBUG] downloadPdf - Erro ao baixar PDF do Supabase:', supabaseError);
          throw new NotFoundException('Erro ao baixar PDF do Supabase');
        }
      }
      // Fallback para URL local antiga
      if (pedido.pdf_url && pedido.pdf_url.includes('localhost')) {
        const urlObj = new URL(pedido.pdf_url);
        const relativePath = urlObj.pathname.startsWith('/') 
          ? urlObj.pathname.substring(1) 
          : urlObj.pathname;
        const absolutePath = join(process.cwd(), relativePath);
        if (existsSync(absolutePath)) {
          console.log('[DEBUG] downloadPdf - Fallback arquivo local:', absolutePath);
          return res.sendFile(absolutePath);
        } else {
          console.log('[DEBUG] downloadPdf - Arquivo local não encontrado:', absolutePath);
          throw new NotFoundException(`Arquivo PDF não encontrado no caminho local: ${absolutePath}`);
        }
      }
      console.log('[DEBUG] downloadPdf - PDF não disponível para este pedido');
      throw new NotFoundException('PDF não disponível para este pedido');
    } catch (error) {
      console.error('[DEBUG] Erro ao fazer download do PDF:', error instanceof Error ? error.message : error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Erro ao processar PDF do pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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
