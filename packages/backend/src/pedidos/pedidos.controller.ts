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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
import { PermissoesGuard } from '../auth/guards/permissoes.guard';
import { RequerPermissoes } from '../auth/decorators/requer-permissoes.decorator';
import { debugLog } from '../common/utils/debug-log';

@ApiTags('pedidos')
@Controller('pedidos')
@UseGuards(JwtAuthGuard, PermissoesGuard)
@ApiBearerAuth()
export class PedidosController {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post()
  @RequerPermissoes('pedidos:criar')
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  create(@Body() createPedidoDto: CreatePedidoDto) {
    debugLog('PedidosController', 'Recebeu createPedidoDto:', createPedidoDto);
    return this.pedidosService.create(createPedidoDto);
  }

  @Get('reports/summary')
  @RequerPermissoes('relatorios:ver')
  @ApiOperation({
    summary: 'Gerar relatório de pedidos',
    description: 'Gera relatório de pedidos com agrupamento por período e filtros',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso.',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  async generateReport(@Query() reportDto: ReportPedidoDto) {
    return this.pedidosService.generateReport(reportDto);
  }

  @Get('reports/pdf')
  @RequerPermissoes('relatorios:exportar')
  @ApiOperation({
    summary: 'Gerar PDF de relatório de pedidos',
    description: 'Gera um arquivo PDF com o relatório de pedidos para o período especificado',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF do relatório gerado com sucesso',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos ou erro ao gerar o relatório',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  async generateReportPdf(
    @Query('data_inicio') data_inicio: string,
    @Query('data_fim') data_fim: string,
    @Query('cliente_id') cliente_id: number,
    @Res() res: Response,
  ) {
    try {
      const reportDto: ReportPedidoDto = { data_inicio, data_fim, cliente_id };
      debugLog(
        'PedidosController',
        'Recebendo requisição para gerar PDF com parâmetros:',
        reportDto,
      );
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
        debugLog('PedidosController', `[DEBUG] (Relatório) pdfResult.path: ${pdfResult.path}`);
        const signedUrl = await this.supabaseService.getSignedUrl(pdfResult.path, 300); // 5 minutos
        debugLog('PedidosController', `[DEBUG] (Relatório) signedUrl: ${signedUrl}`);
        if (!signedUrl) {
          console.error('[DEBUG] (Relatório) Falha ao gerar signed URL!');
          throw new InternalServerErrorException(
            'Falha ao gerar link seguro para o PDF do relatório',
          );
        }
        debugLog('PedidosController', '[DEBUG] (Relatório) Respondendo JSON com signedUrl');
        return res.json({
          url: signedUrl,
          path: pdfResult.path,
        });
      }
    } catch (error) {
      console.error(
        'Erro ao gerar PDF do relatório:',
        error instanceof Error ? error.message : error,
      );
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
  @RequerPermissoes('pedidos:listar')
  @ApiOperation({
    summary: 'Listar todos os pedidos',
    description: 'Lista pedidos com suporte a filtros por data e cliente, além de paginação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pedidos retornada com metadados de paginação.',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  findAll(@Query() filterDto: FilterPedidoDto) {
    debugLog('PedidosController', 'Recebeu request para listar pedidos com filtros:', filterDto);

    // Log detalhado para troubleshooting do filtro de datas
    if (filterDto.startDate && filterDto.endDate) {
      debugLog(
        'PedidosController',
        `Filtrando pedidos de ${filterDto.startDate} até ${filterDto.endDate}`,
      );
    }

    return this.pedidosService.findAll(filterDto);
  }

  @Get(':id')
  @RequerPermissoes('pedidos:ver')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  @ApiResponse({ status: 200, description: 'Pedido encontrado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  findOne(@Param('id') id: string) {
    return this.pedidosService.findOne(+id);
  }

  @Patch(':id')
  @RequerPermissoes('pedidos:editar')
  @ApiOperation({ summary: 'Atualizar pedido' })
  @ApiResponse({ status: 200, description: 'Pedido atualizado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  update(@Param('id') id: string, @Body() updatePedidoDto: UpdatePedidoDto) {
    return this.pedidosService.update(+id, updatePedidoDto);
  }

  @Delete(':id')
  @RequerPermissoes('pedidos:cancelar')
  @ApiOperation({ summary: 'Remover pedido (soft delete)' })
  @ApiResponse({ status: 200, description: 'Pedido removido.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  remove(@Param('id') id: string) {
    return this.pedidosService.remove(+id);
  }

  @Post(':id/repeat')
  @RequerPermissoes('pedidos:criar')
  @ApiOperation({ summary: 'Repetir pedido existente' })
  @ApiResponse({ status: 201, description: 'Novo pedido criado baseado no original.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  repeat(@Param('id') id: string) {
    return this.pedidosService.repeat(+id);
  }

  @Get(':id/pdf')
  @RequerPermissoes('pedidos:ver')
  @ApiOperation({ summary: 'Download do PDF de um pedido' })
  @ApiResponse({ status: 200, description: 'Retorna o arquivo PDF' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'PDF não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  async downloadPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      // Verificar ambiente e configurações
      const isProduction = process.env.NODE_ENV === 'production';
      debugLog(
        'PedidosController',
        `[PDF] Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`,
      );
      debugLog(
        'PedidosController',
        `[PDF] PDF_STORAGE_PATH: ${process.env.PDF_STORAGE_PATH || 'não configurado'}`,
      );
      debugLog(
        'PedidosController',
        `[PDF] UPLOADS_PATH: ${process.env.UPLOADS_PATH || 'não configurado'}`,
      );

      // Verificar disponibilidade do Supabase
      const supabaseAvailable = this.supabaseService && this.supabaseService.isAvailable();
      debugLog('PedidosController', `[PDF] Supabase disponível: ${supabaseAvailable}`);
      if (supabaseAvailable) {
        debugLog(
          'PedidosController',
          `[PDF] Bucket Supabase: ${this.supabaseService.getBucketName()}`,
        );
        debugLog('PedidosController', `[PDF] URL Supabase: ${process.env.SUPABASE_URL}`);
        debugLog(
          'PedidosController',
          `[PDF] SERVICE_ROLE_KEY configurada: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        );
      }

      // Buscar o pedido com informações completas
      const pedido = await this.pedidosService.findOne(id);

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }

      debugLog(
        'PedidosController',
        `[PDF] Buscando PDF para pedido ${id}, caminho: ${pedido.pdf_path}, url: ${pedido.pdf_url}`,
      );

      // ETAPA 1: Se o pedido tem URL do Supabase, redirecionar para lá (prioridade mais alta)
      if (pedido.pdf_url) {
        // Verificar se a URL é válida para o ambiente atual
        const isLocalUrl =
          pedido.pdf_url.includes('localhost') || pedido.pdf_url.includes('127.0.0.1');

        // Em produção, nunca usar URLs locais
        if (isProduction && isLocalUrl) {
          debugLog(
            'PedidosController',
            `[PDF] URL local detectada em produção: ${pedido.pdf_url}, ignorando e gerando nova URL`,
          );
          // Extrair o caminho do arquivo da URL local para usar com o Supabase
          const pathMatch = pedido.pdf_url.match(/\/uploads\/pdfs\/(.*\.pdf)$/);
          const pdfPath = pathMatch ? `pedidos/${pathMatch[1]}` : null;

          if (pdfPath && supabaseAvailable) {
            try {
              debugLog(
                'PedidosController',
                `[PDF] Tentando gerar URL do Supabase para: ${pdfPath}`,
              );
              const signedUrl = await this.supabaseService.getSignedUrl(pdfPath, 3600);
              if (signedUrl) {
                debugLog(
                  'PedidosController',
                  `[PDF] URL assinada gerada com sucesso: ${signedUrl}`,
                );
                // Atualizar o pedido com a URL correta do Supabase
                await this.pedidosService.update(id, { pdf_url: signedUrl });
                return res.redirect(signedUrl);
              }
            } catch (error) {
              console.error(
                `[PDF] Erro ao gerar URL assinada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
              );
              // Continuar para os próximos métodos
            }
          }
        }
        // Verificar se a URL é completa (começa com http ou https) e não é local em produção
        else if (pedido.pdf_url.startsWith('http') && (!isProduction || !isLocalUrl)) {
          debugLog('PedidosController', `[PDF] Redirecionando para URL: ${pedido.pdf_url}`);
          return res.redirect(pedido.pdf_url);
        }
        // Se a URL não for completa, verificar se é um caminho do Supabase
        else if (!pedido.pdf_url.startsWith('http')) {
          debugLog(
            'PedidosController',
            `[PDF] URL não é completa, tentando obter URL do Supabase para: ${pedido.pdf_url}`,
          );
          try {
            if (supabaseAvailable) {
              const signedUrl = await this.supabaseService.getSignedUrl(pedido.pdf_url, 3600); // Aumentar tempo para 1 hora
              if (signedUrl) {
                debugLog('PedidosController', `[PDF] URL assinada gerada: ${signedUrl}`);
                // Atualizar o pedido com a URL completa
                await this.pedidosService.update(id, { pdf_url: signedUrl });
                return res.redirect(signedUrl);
              }
            } else {
              debugLog('PedidosController', `[PDF] Supabase não disponível para gerar URL assinada`);
            }
          } catch (error) {
            console.error(
              `[PDF] Erro ao gerar URL assinada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            );
            // Continuar para os próximos métodos
          }
        }
      }

      // ETAPA 2: Se o pedido tem o caminho Supabase (formato "pedidos/arquivo.pdf"), usar o serviço Supabase
      if (pedido.pdf_path && pedido.pdf_path.startsWith('pedidos/') && this.supabaseService) {
        try {
          debugLog('PedidosController', `[PDF] Tentando baixar do Supabase: ${pedido.pdf_path}`);
          const supabaseResponse = await this.supabaseService.downloadFile(pedido.pdf_path);

          if (supabaseResponse && supabaseResponse.data) {
            const arrayBuffer = await supabaseResponse.data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Content-Type', 'application/pdf');
            debugLog(
              'PedidosController',
              `[PDF] PDF baixado com sucesso do Supabase: ${pedido.pdf_path}`,
            );
            return res.send(buffer);
          }
        } catch (error) {
          debugLog(
            'PedidosController',
            `[PDF] Erro ao baixar do Supabase: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          );
          // Continuar para o próximo método se o Supabase falhar
        }
      }

      // ETAPA 3: Verificar caminhos locais em várias possibilidades
      // Usar a variável isProduction já declarada anteriormente
      const pdfStoragePath =
        process.env.PDF_STORAGE_PATH ||
        (isProduction
          ? '/opt/render/project/src/uploads/pdfs'
          : join(process.cwd(), 'uploads', 'pdfs'));
      const uploadsPath = process.env.UPLOADS_PATH || '/opt/render/project/src/uploads';
      const pdfFileName = `pedido-${id}.pdf`;

      const possiblePaths = [
        // Caminho exato como armazenado no banco
        pedido.pdf_path,

        // Caminhos relativos e absolutos baseados em convenções
        join(pdfStoragePath, basename(pedido.pdf_path || pdfFileName)),
        join(process.cwd(), pedido.pdf_path || ''), // Relativo ao CWD
        join(process.cwd(), 'uploads', 'pdfs', pdfFileName),
        join(uploadsPath, 'pdfs', pdfFileName),
        // Alguns caminhos adicionais que podem estar sendo usados
        join(uploadsPath, pdfFileName),
      ].filter(Boolean); // Remover entradas undefined/null/empty

      // Verificar cada caminho possível
      for (const path of possiblePaths) {
        debugLog('PedidosController', `[PDF] Verificando caminho: ${path}`);
        if (path && existsSync(path)) {
          debugLog('PedidosController', `[PDF] Arquivo encontrado em: ${path}`);

          // Atualizar o caminho do PDF no banco de dados se ele for diferente do armazenado
          if (path !== pedido.pdf_path) {
            try {
              await this.pedidosService.update(id, { pdf_path: path });
              debugLog('PedidosController', `[PDF] Caminho do PDF atualizado para: ${path}`);
            } catch (updateError) {
              console.error(
                '[PDF] Erro ao atualizar caminho do PDF, mas arquivo será enviado:',
                updateError,
              );
            }
          }

          return res.sendFile(path);
        }
      }

      // ETAPA 4: Tentar regenerar o PDF se não foi encontrado
      try {
        debugLog(
          'PedidosController',
          `[PDF] PDF não encontrado. Tentando regenerar para o pedido ${id}...`,
        );
        // Verificar se o serviço possui método para regenerar PDF
        if (typeof this.pedidosService.regeneratePdf === 'function') {
          const result = await this.pedidosService.regeneratePdf(id);
          if (result) {
            debugLog('PedidosController', `[PDF] PDF regenerado com sucesso: ${result}`);
            // Se o resultado for uma URL, redirecionar
            if (typeof result === 'string' && result.startsWith('http')) {
              return res.redirect(result);
            }
            // Se for um caminho local, enviar o arquivo
            else if (typeof result === 'string' && existsSync(result)) {
              return res.sendFile(result);
            }
          }
        } else {
          debugLog('PedidosController', '[PDF] Método regeneratePdf não está disponível');
        }
      } catch (regenerateError) {
        console.error('[PDF] Erro ao regenerar PDF:', regenerateError);
        // Continuamos para o erro 404 se a regeneração falhar
      }

      // Se chegou aqui, o PDF não foi encontrado por nenhum método
      debugLog(
        'PedidosController',
        `[PDF] PDF não encontrado por nenhum método para o pedido ${id}`,
      );
      throw new NotFoundException(`PDF não disponível para o pedido ${id}. Tente gerar novamente.`);
    } catch (error) {
      console.error(
        '[PDF] Erro ao fazer download do PDF:',
        error instanceof Error ? error.message : error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Erro ao processar PDF do pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }

  @Patch(':id/itens/:itemId')
  @RequerPermissoes('pedidos:editar')
  @ApiOperation({ summary: 'Atualizar quantidade de um item do pedido' })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiParam({ name: 'itemId', description: 'ID do item do pedido' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantidade: {
          type: 'number',
          description: 'Nova quantidade do item',
          example: 2,
        },
      },
    },
  })
  async updateItemQuantidade(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('quantidade', ParseFloatPipe) quantidade: number,
  ) {
    return this.pedidosService.updateItemQuantidade(id, itemId, quantidade);
  }
}
