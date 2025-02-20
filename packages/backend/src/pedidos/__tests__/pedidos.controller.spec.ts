import { Test, TestingModule } from '@nestjs/testing';
import { PedidosController } from '../pedidos.controller';
import { PedidosService } from '../pedidos.service';
import { CreatePedidoDto } from '../dto/create-pedido.dto';
import { UpdatePedidoDto, PedidoStatus } from '../dto/update-pedido.dto';
import { FilterPedidoDto } from '../dto/filter-pedido.dto';

describe('PedidosController', () => {
  let controller: PedidosController;
  let service: PedidosService;

  const mockPedido = {
    id: 1,
    cliente_id: 1,
    data_pedido: new Date(),
    status: PedidoStatus.PENDENTE,
    valor_total: 20.0,
    caminho_pdf: '/path/to/pdf',
    deleted_at: null,
    cliente: {
      id: 1,
      nome: 'Cliente Teste',
      cnpj: '12345678901234',
      email: 'cliente@teste.com',
      telefone: '1234567890',
      endereco: 'Rua Teste, 123',
      status: 'ativo',
      deleted_at: null,
    },
    itensPedido: [
      {
        id: 1,
        pedido_id: 1,
        produto_id: 1,
        quantidade: 2,
        preco_unitario: 10.0,
        valor_total_item: 20.0,
        produto: {
          id: 1,
          nome: 'Produto Teste',
          preco_unitario: 10.0,
          tipo_medida: 'un',
          status: 'ativo',
          deleted_at: null,
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosController],
      providers: [
        {
          provide: PedidosService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPedido),
            findAll: jest.fn().mockResolvedValue({
              data: [mockPedido],
              meta: {
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
              },
            }),
            findOne: jest.fn().mockResolvedValue(mockPedido),
            update: jest.fn().mockResolvedValue({
              ...mockPedido,
              status: PedidoStatus.ATUALIZADO,
            }),
            remove: jest.fn().mockResolvedValue({
              ...mockPedido,
              deleted_at: new Date(),
              status: PedidoStatus.CANCELADO,
            }),
            repeat: jest.fn().mockResolvedValue({
              ...mockPedido,
              id: 2,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<PedidosController>(PedidosController);
    service = module.get<PedidosService>(PedidosService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a pedido', async () => {
      const createDto: CreatePedidoDto = {
        cliente_id: 1,
        itens: [
          {
            produto_id: 1,
            quantidade: 2,
          },
        ],
      };

      const result = await controller.create(createDto);
      expect(result).toEqual(mockPedido);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated pedidos', async () => {
      const filterDto: FilterPedidoDto = {
        page: 1,
        limit: 10,
      };

      const result = await controller.findAll(filterDto);
      expect(result).toEqual({
        data: [mockPedido],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(service.findAll).toHaveBeenCalledWith(filterDto);
    });

    it('should apply filters correctly', async () => {
      const filterDto: FilterPedidoDto = {
        page: 1,
        limit: 10,
        cliente_id: 1,
        data_inicial: '2025-02-20',
        data_final: '2025-02-20',
      };

      await controller.findAll(filterDto);
      expect(service.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('findOne', () => {
    it('should return a pedido', async () => {
      const result = await controller.findOne('1');
      expect(result).toEqual(mockPedido);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a pedido', async () => {
      const updateDto: UpdatePedidoDto = {
        status: PedidoStatus.ATUALIZADO,
      };

      const result = await controller.update('1', updateDto);
      expect(result.status).toBe(PedidoStatus.ATUALIZADO);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a pedido', async () => {
      const result = await controller.remove('1');
      expect(result.deleted_at).toBeDefined();
      expect(result.status).toBe(PedidoStatus.CANCELADO);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('repeat', () => {
    it('should create a new pedido based on an existing one', async () => {
      const result = await controller.repeat('1');
      expect(result.id).toBe(2);
      expect(service.repeat).toHaveBeenCalledWith(1);
    });
  });
});
