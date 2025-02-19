import { Test, TestingModule } from '@nestjs/testing';
import { ProdutosController } from '../produtos.controller';
import { ProdutosService } from '../produtos.service';
import { CreateProdutoDto } from '../dto/create-produto.dto';
import { UpdateProdutoDto } from '../dto/update-produto.dto';
import { PageOptionsDto } from '../../common/dto/page-options.dto';

describe('ProdutosController', () => {
  let controller: ProdutosController;
  let service: ProdutosService;

  const mockProduto = {
    id: 1,
    nome: 'Pão Francês',
    preco_unitario: 0.50,
    tipo_medida: 'un',
    status: 'ativo',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProdutosController],
      providers: [
        {
          provide: ProdutosService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockProduto),
            findAll: jest.fn().mockResolvedValue({
              data: [mockProduto],
              meta: {
                page: 1,
                limit: 10,
                itemCount: 1,
                pageCount: 1,
                hasPreviousPage: false,
                hasNextPage: false,
              },
            }),
            findOne: jest.fn().mockResolvedValue(mockProduto),
            update: jest.fn().mockResolvedValue(mockProduto),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<ProdutosController>(ProdutosController);
    service = module.get<ProdutosService>(ProdutosService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a produto', async () => {
      const createDto: CreateProdutoDto = {
        nome: 'Pão Francês',
        preco_unitario: 0.50,
        tipo_medida: 'un',
        status: 'ativo',
      };

      const result = await controller.create(createDto);
      expect(result).toEqual(mockProduto);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated produtos', async () => {
      const pageOptions: PageOptionsDto = { page: 1, limit: 10 };
      const result = await controller.findAll(pageOptions);
      
      expect(result).toEqual({
        data: [mockProduto],
        meta: {
          page: 1,
          limit: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
      expect(service.findAll).toHaveBeenCalledWith(pageOptions);
    });
  });

  describe('findOne', () => {
    it('should return a produto', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual(mockProduto);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a produto', async () => {
      const updateDto: UpdateProdutoDto = {
        nome: 'Pão Atualizado',
      };

      const result = await controller.update(1, updateDto);
      expect(result).toEqual(mockProduto);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a produto', async () => {
      await controller.remove(1);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});