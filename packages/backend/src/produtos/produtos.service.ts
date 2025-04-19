import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Page } from '../common/interfaces/page.interface';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProdutoDto: CreateProdutoDto) {
    try {
      console.log('Recebido:', createProdutoDto);
      
      if (!createProdutoDto.nome) {
        throw new BadRequestException('Nome é obrigatório');
      }

      if (typeof createProdutoDto.preco_unitario !== 'number') {
        throw new BadRequestException('Preço unitário deve ser um número');
      }

      // Normalizar o nome para comparação case-insensitive
      const nomeTratado = createProdutoDto.nome.trim();
      console.log('Nome tratado:', nomeTratado);
      
      // Verificar se já existe produto com o mesmo nome (case-insensitive, igualdade exata)
      const existingProduto = await this.prisma.produto.findFirst({
        where: {
          nome: {
            equals: nomeTratado,
            mode: 'insensitive',
          },
          deleted_at: null,
        },
      });

      console.log('Produto existente:', existingProduto);

      if (existingProduto) {
        throw new BadRequestException('Já existe um produto com este nome');
      }

      // Criar produto mantendo os espaços originais após trim
      const produto = await this.prisma.produto.create({
        data: {
          nome: nomeTratado,
          preco_unitario: createProdutoDto.preco_unitario,
          tipo_medida: createProdutoDto.tipo_medida,
          status: createProdutoDto.status || 'ativo',
        },
      });

      console.log('Produto criado:', produto);
      return produto;

    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error && 'code' in error && error['code'] === 'P2002') {
        throw new BadRequestException('Já existe um produto com este nome');
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      
      throw new BadRequestException(
        'Erro ao criar produto. Verifique os dados informados: ' + errorMessage
      );
    }
  }

  async findAll(pageOptions?: PageOptionsDto): Promise<Page<any>> {
    try {
      const { page = 1, limit = 10, search, status, orderBy, order = 'asc' } = pageOptions || {};
      const skip = (page - 1) * limit;

      const where: Prisma.ProdutoWhereInput = {
        deleted_at: null,
      };

      // Adicionar filtro por status se fornecido
      if (status) {
        where.status = status;
      }

      // Adicionar busca por nome se fornecida
      if (search) {
        where.nome = {
          contains: search.toLowerCase()
        };
      }

      // Configurar ordenação
      let orderByClause: Prisma.ProdutoOrderByWithRelationInput = { nome: order };
      if (orderBy === 'preco_unitario') {
        orderByClause = { preco_unitario: order };
      }

      const [items, total] = await Promise.all([
        this.prisma.produto.findMany({
          where,
          orderBy: orderByClause,
          skip,
          take: limit,
        }),
        this.prisma.produto.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: items,
        meta: {
          page,
          limit,
          itemCount: total,
          pageCount: totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException('Erro ao listar produtos');
    }
  }

  async findOne(id: number, includeDeleted = false) {
    try {
      const where: Prisma.ProdutoWhereInput = { id };
      
      // Se não incluir deletados, adiciona filtro de deleted_at null
      if (!includeDeleted) {
        where.deleted_at = null;
      }
      
      const produto = await this.prisma.produto.findFirst({ where });

      if (!produto) {
        throw new NotFoundException('Produto não encontrado');
      }

      return produto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar produto');
    }
  }

  async update(id: number, updateProdutoDto: UpdateProdutoDto, includeDeleted = false) {
    try {
      console.log('Atualizando produto:', { id, dados: updateProdutoDto, includeDeleted });
      
      // Verificar se o produto existe (incluindo ou não deletados conforme parâmetro)
      const produtoExistente = await this.findOne(id, includeDeleted);
      
      // Se o produto foi soft-deleted e estamos atualizando seu status para ativo,
      // limpar o campo deleted_at
      if (produtoExistente.deleted_at && updateProdutoDto.status === 'ativo') {
        console.log('Reativando produto anteriormente deletado');
        updateProdutoDto = {
          ...updateProdutoDto,
          deleted_at: null
        };
      }

      // Se o nome está sendo atualizado, verificar duplicação
      if (updateProdutoDto.nome) {
        const nomeTratado = updateProdutoDto.nome.trim();
        console.log('Nome tratado:', nomeTratado);
        
        // Corrigido o where para não usar not: null que estava causando erro
        const existingProduto = await this.prisma.produto.findFirst({
          where: {
            nome: {
              equals: nomeTratado,
              mode: 'insensitive',
            },
            id: { not: id },
            deleted_at: null,
          },
        });

        console.log('Produto existente:', existingProduto);

        if (existingProduto) {
          throw new BadRequestException('Já existe um produto com este nome');
        }

        // Atualizar com o nome tratado
        updateProdutoDto.nome = nomeTratado;
      }

      const produto = await this.prisma.produto.update({
        where: { id },
        data: updateProdutoDto,
      });

      console.log('Produto atualizado:', produto);
      return produto;

    } catch (error) {
      console.error('Erro detalhado:', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Verificar se é um erro do Prisma
      if (error instanceof Error && 'code' in error && error['code'] === 'P2002') {
        throw new BadRequestException('Já existe um produto com este nome');
      }

      // Extrair mensagem de erro de forma segura
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      throw new BadRequestException(
        'Não foi possível atualizar o produto. Verifique os dados informados: ' + errorMessage
      );
    }
  }

  async remove(id: number) {
    try {
      // Verificar se o produto existe e não está deletado
      await this.findOne(id);

      // Verificar se o produto está sendo usado em algum pedido
      const pedidoComProduto = await this.prisma.itemPedido.findFirst({
        where: {
          produto_id: id,
          pedido: {
            deleted_at: null,
          },
        },
      });

      if (pedidoComProduto) {
        throw new BadRequestException('Não é possível excluir um produto que está sendo usado em pedidos');
      }

      return await this.prisma.produto.update({
        where: { id },
        data: { 
          deleted_at: new Date(),
          status: 'inativo',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Não foi possível remover o produto');
    }
  }
}
