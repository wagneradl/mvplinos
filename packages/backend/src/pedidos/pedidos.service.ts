import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto, PedidoStatus } from './dto/update-pedido.dto';
import { FilterPedidoDto } from './dto/filter-pedido.dto';
import { ReportPedidoDto } from './dto/report-pedido.dto';
import { Prisma } from '@prisma/client';
import { join } from 'path';
import { format } from 'date-fns';
import { debugLog } from '../common/utils/debug-log';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  // Função auxiliar para depurar problemas de data
  private debugDates(date: Date): void {
    debugLog('PedidosService', 'Debug data:');
    debugLog('PedidosService', '- toString():', date.toString());
    debugLog('PedidosService', '- toISOString():', date.toISOString());
    debugLog('PedidosService', '- toLocaleDateString():', date.toLocaleDateString());
    debugLog('PedidosService', '- getTimezoneOffset():', date.getTimezoneOffset());
    debugLog(
      'PedidosService',
      '- getFullYear()/getMonth()/getDate():',
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
  }

  async create(createPedidoDto: CreatePedidoDto) {
    const { cliente_id, itens } = createPedidoDto;

    // Validar se o pedido tem itens
    if (!itens || itens.length === 0) {
      throw new BadRequestException('O pedido deve ter pelo menos um item');
    }

    // Buscar informações dos produtos
    const produtosIds = itens.map((item) => item.produto_id);
    const produtos = await this.prisma.produto.findMany({
      where: {
        id: {
          in: produtosIds,
        },
      },
    });

    // Mapear produtos por ID para fácil acesso
    const produtosMap = new Map(produtos.map((p) => [p.id, p]));

    // Criar array com informações completas dos itens
    const produtosInfo = itens.map((item) => {
      const produto = produtosMap.get(item.produto_id);
      if (!produto) {
        throw new NotFoundException(`Produto com ID ${item.produto_id} não encontrado`);
      }

      // Validar se o produto está ativo
      if (produto.status === 'inativo') {
        throw new BadRequestException(`${produto.nome} está inativo`);
      }

      // Validar se o produto não está deletado
      if (produto.deleted_at) {
        throw new BadRequestException(`${produto.nome} não está disponível`);
      }

      // Validar quantidade
      if (item.quantidade <= 0) {
        throw new BadRequestException('A quantidade deve ser maior que zero');
      }

      // Usar sempre o preço atual do produto
      const valor_total_item = Number((item.quantidade * produto.preco_unitario).toFixed(2));

      return {
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: produto.preco_unitario,
        valor_total_item,
      };
    });

    // Calcular o valor total do pedido
    const valorTotal = Number(
      produtosInfo
        .reduce((total, item) => {
          return total + item.valor_total_item;
        }, 0)
        .toFixed(2),
    );

    try {
      // ETAPA 1: Criar pedido em transação separada
      // Isso garante que a transação do banco seja rápida
      // e não expire durante a geração do PDF que é mais lenta
      let pedido = await this.prisma.$transaction(async (tx) => {
        // Verificar se o cliente existe e não está deletado
        const cliente = await tx.cliente.findFirst({
          where: { id: cliente_id, deleted_at: null },
        });

        if (!cliente) {
          throw new NotFoundException(`Cliente com ID ${cliente_id} não encontrado`);
        }

        // Validar se o cliente está ativo
        if (cliente.status === 'inativo') {
          throw new BadRequestException('Cliente está inativo');
        }

        // Data atual para o pedido
        const dataPedido = new Date();
        debugLog('PedidosService', 'Criando pedido com data:', dataPedido.toISOString());

        // Criar o pedido com os itens (sem esperar o PDF)
        return await tx.pedido.create({
          data: {
            cliente_id,
            data_pedido: dataPedido,
            valor_total: valorTotal,
            status: PedidoStatus.ATIVO,
            observacoes: createPedidoDto.observacoes, // Adicionar observações do pedido
            pdf_path: '', // Será atualizado após gerar o PDF
            itensPedido: {
              create: produtosInfo,
            },
          },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        });
      });

      // ETAPA 2: Gerar o PDF separadamente (fora da transação)
      // Gerar PDF do pedido usando o serviço PDF
      try {
        // Fetch do pedido com relações para usar na geração de PDF
        pedido = await this.prisma.pedido.findFirst({
          where: { id: pedido.id },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        });

        // Gerar o PDF (operação lenta que estava causando o timeout da transação)
        debugLog('PedidosService', 'Gerando PDF para o pedido:', pedido.id);
        const pdfResult = await this.pdfService.generatePedidoPdf(pedido);

        // Preparar os dados para atualização do pedido
        const updateData: {
          pdf_path?: string;
          pdf_url?: string;
        } = {};

        if (typeof pdfResult === 'string') {
          // Formato antigo: apenas caminho local
          updateData.pdf_path = pdfResult;
          debugLog('PedidosService', 'PDF gerado localmente:', pdfResult);
        } else {
          // Novo formato: objeto com caminho e URL do Supabase
          updateData.pdf_path = pdfResult.path;
          updateData.pdf_url = pdfResult.url;
          debugLog('PedidosService', 'PDF enviado para Supabase:', pdfResult.url);
        }

        // ETAPA 3: Atualizar o pedido com as informações do PDF em uma nova transação
        await this.prisma.pedido.update({
          where: { id: pedido.id },
          data: updateData,
        });

        // Buscar o pedido atualizado com todas as informações para retornar
        return await this.prisma.pedido.findFirst({
          where: { id: pedido.id },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        });
      } catch (pdfError) {
        // Se houver erro na geração do PDF, logamos mas não falhamos o pedido todo
        console.error('Erro ao gerar PDF, mas o pedido foi criado:', pdfError);
        debugLog('PedidosService', 'Pedido criado com ID:', pedido.id);

        // Retornar o pedido mesmo sem o PDF para não perder a operação
        return pedido;
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Erro ao criar pedido');
      }
      throw error;
    }
  }

  async findAll(filter: FilterPedidoDto) {
    try {
      // Definir valores padrão e aplicar transformações
      const page = filter.page || 1;
      const limit = filter.limit || 10;
      const skip = (page - 1) * limit;

      debugLog('PedidosService', 'Processando filtros:', filter);

      // Abordagem simplificada - usar Prisma diretamente com where conditions
      // para evitar problemas com SQL raw
      const where: Prisma.PedidoWhereInput = {};

      // Filtro de cliente
      if (filter.clienteId) {
        where.cliente_id = filter.clienteId;
        debugLog('PedidosService', `Filtrando por cliente_id: ${filter.clienteId}`);
      }

      // Filtro de status
      if (filter.status) {
        where.status = filter.status;
        debugLog('PedidosService', `Filtrando por status: ${filter.status}`);
      }

      // Filtro de datas - abordagem de intervalo manual
      if (filter.startDate && filter.endDate) {
        try {
          const startDateStr = filter.startDate.substring(0, 10);
          const endDateStr = filter.endDate.substring(0, 10);

          debugLog(
            'PedidosService',
            `Filtrando pedidos entre as datas ${startDateStr} e ${endDateStr}`,
          );

          // Precisamos gerar uma lista com todas as datas no intervalo
          // para contemplar problemas de timezone
          const dates = [];
          const startParts = startDateStr.split('-').map((p) => parseInt(p));
          const endParts = endDateStr.split('-').map((p) => parseInt(p));

          const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
          const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
          this.debugDates(start);
          this.debugDates(end);

          // Criar array com todas as datas no intervalo (como strings)
          const current = new Date(start);
          while (current <= end) {
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            dates.push(dateStr);
            current.setDate(current.getDate() + 1);
          }

          debugLog('PedidosService', 'Datas no intervalo:', dates);

          // Criar uma cláusula OR para cada data
          if (dates.length > 0) {
            where.OR = dates.map((dateStr) => ({
              data_pedido: {
                // Ajustamos os hários para cubrir o dia inteiro
                gte: new Date(`${dateStr}T00:00:00.000`),
                lt: new Date(`${dateStr}T23:59:59.999`),
              },
            }));

            debugLog('PedidosService', `Criadas ${where.OR.length} condições OR para as datas`);
          }
        } catch (error) {
          console.error('Erro ao processar filtro de datas:', error);
          // Não aplicamos o filtro de data se houver erro
          if (error instanceof Error) {
            debugLog('PedidosService', 'Erro detalhado:', error.message);
          }
        }
      }

      debugLog('PedidosService', 'Consulta com where conditions:', where);

      // Usar o Prisma para fazer a consulta
      const [data, total] = await Promise.all([
        this.prisma.pedido.findMany({
          skip,
          take: limit,
          where,
          orderBy: {
            data_pedido: 'desc',
          },
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        }),
        this.prisma.pedido.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      debugLog('PedidosService', `Encontrados ${data.length} pedidos de um total de ${total}`);

      // Log para debug
      if (data.length > 0) {
        debugLog('PedidosService', 'Primeiro pedido encontrado:', {
          id: data[0].id,
          status: data[0].status,
          data: data[0].data_pedido.toISOString(),
        });
      }

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      if (error instanceof Error) {
        throw new BadRequestException('Erro ao buscar pedidos: ' + error.message);
      } else {
        throw new BadRequestException('Erro ao buscar pedidos');
      }
    }
  }

  async findOne(id: number) {
    try {
      const pedido = await this.prisma.pedido.findFirst({
        where: { id },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }

      // Log para depurar o campo observacoes
      debugLog(
        'PedidosService',
        `[DEBUG][PEDIDO] Pedido ${id} tem observacoes:`,
        pedido.observacoes ? 'SIM' : 'NÃO',
      );
      if (pedido.observacoes) {
        debugLog(
          'PedidosService',
          `[DEBUG][PEDIDO] Observacoes do pedido ${id}:`,
          pedido.observacoes,
        );
      }

      return pedido;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar pedido');
    }
  }

  /**
   * Regenera o PDF de um pedido existente
   * @param id ID do pedido
   * @returns String com o caminho ou URL do PDF regenerado, ou null se falhar
   */
  async regeneratePdf(id: number): Promise<string | null> {
    try {
      // Buscar o pedido com todas as informações necessárias
      const pedido = await this.findOne(id);

      if (!pedido) {
        console.error(`[PDF] Não foi possível regenerar PDF: Pedido ${id} não encontrado`);
        return null;
      }

      debugLog('PedidosService', `[PDF] Regenerando PDF para o pedido ${id}`);

      // Usar o serviço de PDF para gerar o PDF novamente
      const pdfResult = await this.pdfService.generatePedidoPdf(pedido);

      // Atualizar o pedido com o novo caminho/URL do PDF
      const updateData: {
        pdf_path?: string;
        pdf_url?: string;
      } = {};

      if (typeof pdfResult === 'string') {
        // Formato antigo: apenas caminho local
        updateData.pdf_path = pdfResult;
        debugLog('PedidosService', `[PDF] PDF regenerado localmente: ${pdfResult}`);

        // Atualizar o pedido no banco com o novo caminho
        await this.prisma.pedido.update({
          where: { id },
          data: updateData,
        });

        return pdfResult;
      } else {
        // Novo formato: objeto com caminho e URL do Supabase
        updateData.pdf_path = pdfResult.path;
        updateData.pdf_url = pdfResult.url;
        debugLog(
          'PedidosService',
          `[PDF] PDF regenerado e enviado para Supabase: ${pdfResult.url}`,
        );

        // Atualizar o pedido no banco com o novo caminho e URL
        await this.prisma.pedido.update({
          where: { id },
          data: updateData,
        });

        return pdfResult.url || pdfResult.path;
      }
    } catch (error) {
      console.error(
        `[PDF] Erro ao regenerar PDF para pedido ${id}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Atualiza apenas o caminho do PDF de um pedido
   * @param id ID do pedido
   * @param path Novo caminho do PDF
   */
  async updatePdfPath(id: number, path: string): Promise<void> {
    try {
      await this.prisma.pedido.update({
        where: { id },
        data: { pdf_path: path },
      });
      debugLog(
        'PedidosService',
        `[PDF] Caminho do PDF atualizado com sucesso para pedido ${id}: ${path}`,
      );
    } catch (error) {
      console.error(`[PDF] Erro ao atualizar caminho do PDF para pedido ${id}:`, error);
      // Não lançamos o erro para evitar interromper o fluxo principal
    }
  }

  async update(id: number, updatePedidoDto: UpdatePedidoDto, regenerarPdf: boolean = false) {
    try {
      const pedido = await this.prisma.pedido.findFirst({
        where: { id },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
      }

      if (pedido.status === PedidoStatus.CANCELADO) {
        throw new BadRequestException('Não é possível atualizar um pedido cancelado');
      }

      // Validar se está tentando cancelar um pedido ativo
      if (
        updatePedidoDto.status === PedidoStatus.CANCELADO &&
        pedido.status === PedidoStatus.ATIVO
      ) {
        // Permitido cancelar pedidos ativos, não precisa fazer nada aqui
      }

      // Atualizar o pedido
      const pedidoAtualizado = await this.prisma.pedido.update({
        where: { id },
        data: updatePedidoDto,
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      // Se o pedido for atualizado com sucesso e regenerarPdf for true, gerar um novo PDF
      if (regenerarPdf) {
        debugLog('PedidosService', 'Regenerando PDF para pedido atualizado:', pedidoAtualizado.id);

        // Gerar um timestamp para evitar cache do navegador
        const timestamp = new Date().getTime();

        // Gerar o PDF do pedido atualizado
        const pdfResult = await this.pdfService.generatePedidoPdf({
          ...pedidoAtualizado,
          id: `${pedidoAtualizado.id}-${timestamp}`, // Gerar um ID único para o PDF
        });

        // Preparar os dados para atualização do pedido
        const updateData: {
          pdf_path?: string;
          pdf_url?: string;
        } = {};

        if (typeof pdfResult === 'string') {
          // Formato antigo: apenas caminho local
          updateData.pdf_path = pdfResult;
          debugLog('PedidosService', 'PDF regenerado localmente:', pdfResult);
        } else {
          // Novo formato: objeto com caminho e URL do Supabase
          updateData.pdf_path = pdfResult.path;
          updateData.pdf_url = pdfResult.url;
          debugLog('PedidosService', 'PDF regenerado e enviado para Supabase:', pdfResult.url);
        }

        // Atualizar o pedido com o caminho do PDF
        return await this.prisma.pedido.update({
          where: { id },
          data: updateData,
          include: {
            cliente: true,
            itensPedido: {
              include: {
                produto: true,
              },
            },
          },
        });
      }

      return pedidoAtualizado;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao atualizar pedido');
    }
  }

  async remove(id: number) {
    try {
      // Verifica se pedido existe (findOne lança NotFoundException se não)
      await this.findOne(id);

      // Modificado para apenas mudar o status para CANCELADO,
      // sem usar deleted_at para permitir que o pedido continue aparecendo nas listagens
      return await this.prisma.pedido.update({
        where: { id },
        data: {
          status: PedidoStatus.CANCELADO,
        },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao remover pedido');
    }
  }

  async repeat(id: number) {
    try {
      const pedidoOriginal = await this.findOne(id);

      // Verificar se o cliente ainda está ativo
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: pedidoOriginal.cliente_id, deleted_at: null },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente com ID ${pedidoOriginal.cliente_id} não encontrado`);
      }

      // Verificar se todos os produtos ainda estão ativos
      const produtosIds = pedidoOriginal.itensPedido.map((item) => item.produto_id);
      const produtos = await this.prisma.produto.findMany({
        where: {
          id: { in: produtosIds },
          deleted_at: null,
        },
      });

      if (produtos.length !== produtosIds.length) {
        throw new BadRequestException(
          'Um ou mais produtos do pedido original não estão mais disponíveis',
        );
      }

      // Criar novo pedido com os mesmos dados
      const novoPedido = await this.create({
        cliente_id: pedidoOriginal.cliente_id,
        itens: pedidoOriginal.itensPedido.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
        })),
      });

      return novoPedido;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao repetir pedido');
    }
  }

  async updateItemQuantidade(pedidoId: number, itemId: number, quantidade: number) {
    try {
      const pedido = await this.prisma.pedido.findFirst({
        where: { id: pedidoId },
        include: {
          itensPedido: true,
        },
      });

      if (!pedido) {
        throw new NotFoundException(`Pedido com ID ${pedidoId} não encontrado`);
      }

      if (pedido.status === PedidoStatus.CANCELADO) {
        throw new BadRequestException('Não é possível atualizar um pedido cancelado');
      }

      const item = await this.prisma.itemPedido.findFirst({
        where: { id: itemId, pedido_id: pedidoId },
        include: {
          produto: true,
        },
      });

      if (!item) {
        throw new NotFoundException(`Item com ID ${itemId} não encontrado no pedido ${pedidoId}`);
      }

      // Validar quantidade
      if (quantidade <= 0) {
        throw new BadRequestException('A quantidade deve ser maior que zero');
      }

      // Atualizar item e recalcular valores
      const valor_total_item = Number((quantidade * item.preco_unitario).toFixed(2));

      const itemAtualizado = await this.prisma.itemPedido.update({
        where: { id: itemId },
        data: {
          quantidade,
          valor_total_item,
        },
      });

      // Recalcular valor total do pedido
      const itensAtualizados = pedido.itensPedido.map((i) => {
        if (i.id === itemId) {
          return itemAtualizado;
        }
        return i;
      });

      const valor_total = Number(
        itensAtualizados
          .reduce((total, i) => {
            return total + (i.id === itemId ? valor_total_item : i.valor_total_item);
          }, 0)
          .toFixed(2),
      );

      // Atualizar pedido
      return await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          valor_total,
          status: PedidoStatus.ATIVO,
        },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao atualizar quantidade do item');
    }
  }

  /**
   * Obtém o caminho do arquivo PDF para um pedido
   * @param id ID do pedido
   * @returns Caminho do arquivo PDF
   * @deprecated Use getPdfInfo em seu lugar
   */
  async getPdfPath(id: number): Promise<string> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
    }

    if (!pedido.pdf_path) {
      throw new BadRequestException(`O pedido #${id} não tem PDF disponível`);
    }

    return pedido.pdf_path;
  }

  /**
   * Obtém as informações do PDF para um pedido (caminho e URL)
   * @param id ID do pedido
   * @returns Objeto com informações do PDF (caminho e URL)
   */
  async getPdfInfo(id: number): Promise<{
    pdfPath: string | null;
    pdfUrl: string | null;
    hasUrl: boolean;
  }> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado`);
    }

    // Verificar se temos informações do PDF
    const result = {
      pdfPath: pedido.pdf_path || null,
      pdfUrl: pedido.pdf_url || null,
      hasUrl: Boolean(pedido.pdf_url),
    };

    if (!result.pdfPath && !result.pdfUrl) {
      throw new BadRequestException(`O pedido #${id} não tem PDF disponível`);
    }

    return result;
  }

  /**
   * Gera o PDF do relatório de pedidos e retorna o caminho local ou a URL do Supabase
   */
  async generateReportPdf(
    reportDto: ReportPedidoDto,
  ): Promise<string | { url: string; path: string }> {
    try {
      // Primeiro, gerar os dados do relatório
      const reportDataRaw = await this.generateReport(reportDto);
      // Adaptar para o formato esperado pelo PDF
      const reportData = {
        ...reportDataRaw,
        titulo: 'Relatório de Vendas',
        itens: reportDataRaw.detalhes,
        dataInicio: reportDataRaw.periodo?.inicio,
        dataFim: reportDataRaw.periodo?.fim,
      };
      // Se tiver cliente_id, buscar os dados do cliente
      let clienteData = null;
      if (reportDto.cliente_id && reportData.cliente) {
        clienteData = reportData.cliente;
      }
      // Gerar o PDF do relatório
      const pdfResult = await this.pdfService.generateReportPdf(reportData, clienteData);
      if (typeof pdfResult === 'string') {
        // Local file path
        const fullPath = join(process.cwd(), pdfResult);
        debugLog('PedidosService', 'Caminho completo do PDF:', fullPath);
        return fullPath;
      } else {
        // Supabase: retorna objeto { path, url }
        debugLog('PedidosService', 'PDF enviado para Supabase:', pdfResult.url);
        return pdfResult;
      }
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório:', error);
      if (error instanceof Error) {
        throw new BadRequestException(`Erro ao gerar PDF do relatório: ${error.message}`);
      }
      throw new BadRequestException('Erro ao gerar PDF do relatório');
    }
  }

  async generateReport(reportDto: ReportPedidoDto) {
    const { data_inicio, data_fim, cliente_id } = reportDto;

    if (!data_inicio || !data_fim) {
      throw new BadRequestException('As datas inicial e final são obrigatórias');
    }

    debugLog(
      'PedidosService',
      `Gerando relatório para o período de ${data_inicio} até ${data_fim}`,
    );
    debugLog('PedidosService', `Cliente ID: ${cliente_id || 'Todos os clientes'}`);

    try {
      // Abordagem de intervalo manual - igual ao usado em findAll
      const startDateStr = data_inicio.substring(0, 10);
      const endDateStr = data_fim.substring(0, 10);

      debugLog(
        'PedidosService',
        `Filtrando pedidos entre as datas ${startDateStr} e ${endDateStr}`,
      );

      // Precisamos gerar uma lista com todas as datas no intervalo
      // para contemplar problemas de timezone
      const dates = [];
      const startParts = startDateStr.split('-').map((p) => parseInt(p));
      const endParts = endDateStr.split('-').map((p) => parseInt(p));

      const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
      this.debugDates(start);
      this.debugDates(end);

      // Criar array com todas as datas no intervalo (como strings)
      const current = new Date(start);
      while (current <= end) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        dates.push(dateStr);
        current.setDate(current.getDate() + 1);
      }

      debugLog('PedidosService', 'Datas no intervalo para relatório:', dates);

      // Condição where básica (status = ATIVO)
      const where: Prisma.PedidoWhereInput = {
        status: PedidoStatus.ATIVO,
      };

      // Adicionar filtro de cliente se fornecido
      if (cliente_id) {
        where.cliente_id = cliente_id;
      }

      // Criar uma cláusula OR para cada data no intervalo
      if (dates.length > 0) {
        where.OR = dates.map((dateStr) => ({
          data_pedido: {
            // Ajustamos os horários para cubrir o dia inteiro
            gte: new Date(`${dateStr}T00:00:00.000`),
            lt: new Date(`${dateStr}T23:59:59.999`),
          },
        }));

        debugLog(
          'PedidosService',
          `Criadas ${where.OR.length} condições OR para as datas no relatório`,
        );
      }

      debugLog('PedidosService', 'Consulta de relatório com where conditions:', where);

      const pedidos = await this.prisma.pedido.findMany({
        where,
        include: {
          itensPedido: true,
          cliente: true,
        },
        orderBy: {
          data_pedido: 'asc',
        },
      });

      debugLog(
        'PedidosService',
        `Encontrados ${pedidos.length} pedidos ativos no período para relatório`,
      );

      // Log para debug do primeiro pedido encontrado
      if (pedidos.length > 0) {
        debugLog('PedidosService', 'Primeiro pedido do relatório:', {
          id: pedidos[0].id,
          status: pedidos[0].status,
          data: pedidos[0].data_pedido.toISOString(),
        });
      }

      const summary = {
        total_orders: pedidos.length,
        total_value: pedidos.reduce((sum, pedido) => sum + pedido.valor_total, 0),
        average_value:
          pedidos.length > 0
            ? pedidos.reduce((sum, pedido) => sum + pedido.valor_total, 0) / pedidos.length
            : 0,
      };

      // Montar colunas para o relatório detalhado
      const colunas = ['Pedido', 'Data', 'Valor Total'];
      // Mapear os dados detalhados para as colunas
      // Cada pedido é uma linha: { pedido, data, valor_total }
      const detalhes = pedidos.map((pedido) => ({
        pedido: pedido.id,
        data: format(new Date(pedido.data_pedido), 'dd/MM/yyyy'),
        valor_total: pedido.valor_total,
      }));
      // Observações opcionais
      const observacoes =
        pedidos.length === 0 ? 'Nenhum pedido encontrado para o período selecionado.' : '';

      return {
        resumo: summary,
        detalhes,
        colunas,
        total: summary.total_value,
        observacoes,
        periodo: {
          inicio: data_inicio,
          fim: data_fim,
        },
        cliente: cliente_id ? pedidos.find((p) => p.cliente_id === cliente_id)?.cliente : null,
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      if (error instanceof Error) {
        throw new BadRequestException(`Erro ao gerar relatório: ${error.message}`);
      }
      throw new BadRequestException('Erro ao gerar relatório');
    }
  }
}
