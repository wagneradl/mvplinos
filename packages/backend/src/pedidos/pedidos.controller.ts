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
import { join, basename } from 'path';
import { existsSync } from 'fs';
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
      // Buscar pedido pelo ID para obter o caminho ou URL do PDF
      const pedido = await this.pedidosService.findOne(id);
      
      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }
      
      // Verificar se o pedido tem PDF
      if (!pedido.pdf_path && !pedido.pdf_url) {
        throw new NotFoundException(`PDF não encontrado para o pedido ${id}`);
      }
      
      // Verificar ambiente de execução para ajuste de caminhos
      const isProduction = process.env.NODE_ENV === 'production';
      const pdfStoragePath = process.env.PDF_STORAGE_PATH || 
        (isProduction ? '/opt/render/project/src/uploads/pdfs' : join(process.cwd(), 'uploads', 'pdfs'));
      
      console.log(`[PDF] Diretório de armazenamento: ${pdfStoragePath}`);
      console.log(`[PDF] Pedido PDF path: ${pedido.pdf_path}`);
      console.log(`[PDF] Pedido PDF URL: ${pedido.pdf_url}`);
      
      // PRIORIDADE 1: Tentar baixar do Supabase (se tiver URL do supabase)
      if (pedido.pdf_path && pedido.pdf_path.startsWith('pedidos/') && this.supabaseService) {
        try {
          console.log(`[PDF] Tentando baixar do Supabase: ${pedido.pdf_path}`);
          const supabaseResponse = await this.supabaseService.downloadFile(pedido.pdf_path);
          
          if (supabaseResponse && supabaseResponse.data) {
            const arrayBuffer = await supabaseResponse.data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Content-Type', 'application/pdf');
            console.log(`[PDF] PDF baixado com sucesso do Supabase: ${pedido.pdf_path}`);
            return res.send(buffer);
          }
        } catch (error) {
          console.log(`[PDF] Erro ao baixar do Supabase: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          // Continuar para o próximo método se o Supabase falhar
        }
      }
      
      // PRIORIDADE 2: Verificar caminho local completo
      if (pedido.pdf_path) {
        // Tentar vários formatos de caminho para compatibilidade
        const possiblePaths = [
          // 1. Caminho exato como armazenado no banco
          pedido.pdf_path,
          
          // 2. Caminho absoluto baseado no PDF_STORAGE_PATH
          join(pdfStoragePath, basename(pedido.pdf_path)),
          
          // 3. Caminho relativo ao diretório de trabalho (para desenvolvimento)
          join(process.cwd(), 'uploads', 'pdfs', basename(pedido.pdf_path))
        ];
        
        // Em produção, adicionar o caminho direto do Render
        if (isProduction) {
          possiblePaths.push(join('/opt/render/project/src/uploads/pdfs', basename(pedido.pdf_path)));
        }
        
        // Verificar cada caminho possível
        for (const path of possiblePaths) {
          console.log(`[PDF] Verificando caminho: ${path}`);
          if (existsSync(path)) {
            console.log(`[PDF] Arquivo encontrado em: ${path}`);
            return res.sendFile(path);
          }
        }
      }
      
      // PRIORIDADE 3: Tentar extrair caminho da URL (caso seja URL local)
      if (pedido.pdf_url && pedido.pdf_url.includes('localhost')) {
        try {
          const urlObj = new URL(pedido.pdf_url);
          const relativePath = urlObj.pathname.startsWith('/') 
            ? urlObj.pathname.substring(1) 
            : urlObj.pathname;
          
          // Tentar vários caminhos possíveis baseados na URL
          const possibleUrls = [
            join(process.cwd(), relativePath),
            join(pdfStoragePath, basename(relativePath))
          ];
          
          for (const path of possibleUrls) {
            console.log(`[PDF] Verificando URL path: ${path}`);
            if (existsSync(path)) {
              console.log(`[PDF] Arquivo encontrado via URL em: ${path}`);
              return res.sendFile(path);
            }
          }
        } catch (error) {
          console.log(`[PDF] Erro ao processar URL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
      
      // Nenhum método funcionou
      console.log(`[PDF] PDF não encontrado por nenhum método para o pedido ${id}`);
      throw new NotFoundException(`PDF não disponível para o pedido ${id}. Tente gerar novamente.`);
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
