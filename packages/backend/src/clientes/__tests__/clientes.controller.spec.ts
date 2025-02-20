import { Test, TestingModule } from '@nestjs/testing';
import { ClientesController } from '../clientes.controller';
import { ClientesService } from '../clientes.service';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { UpdateClienteDto } from '../dto/update-cliente.dto';

describe('ClientesController', () => {
  let controller: ClientesController;
  let service: ClientesService;

  const mockCliente = {
    id: 1,
    cnpj: '12.345.678/0001-90',
    razao_social: 'Empresa Teste LTDA',
    nome_fantasia: 'Empresa Teste',
    telefone: '(11) 98765-4321',
    email: 'contato@empresa.com',
    status: 'ativo',
    pedidos: [],
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [
        {
          provide: ClientesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockCliente),
            findAll: jest.fn().mockResolvedValue([mockCliente]),
            findOne: jest.fn().mockResolvedValue(mockCliente),
            findByCnpj: jest.fn().mockResolvedValue(mockCliente),
            update: jest.fn().mockResolvedValue(mockCliente),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<ClientesController>(ClientesController);
    service = module.get<ClientesService>(ClientesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a cliente', async () => {
      const createDto: CreateClienteDto = {
        cnpj: '12.345.678/0001-90',
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Empresa Teste',
        telefone: '(11) 98765-4321',
        email: 'contato@empresa.com',
        status: 'ativo',
      };

      const result = await controller.create(createDto);
      expect(result).toEqual(mockCliente);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle service errors', async () => {
      const createDto: CreateClienteDto = {
        cnpj: '12.345.678/0001-90',
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Empresa Teste',
        telefone: '(11) 98765-4321',
        email: 'contato@empresa.com',
        status: 'ativo',
      };

      jest.spyOn(service, 'create').mockRejectedValue(new Error());
      await expect(controller.create(createDto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated clientes', async () => {
      const pageOptions = { page: 1, limit: 10 };
      const paginatedResponse = {
        data: [mockCliente],
        meta: {
          page: 1,
          limit: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(paginatedResponse);
      
      const result = await controller.findAll(pageOptions);
      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(pageOptions);
    });

    it('should handle service errors', async () => {
      const pageOptions = { page: 1, limit: 10 };
      jest.spyOn(service, 'findAll').mockRejectedValue(new Error());
      await expect(controller.findAll(pageOptions)).rejects.toThrow();
    });

    it('should use default page options when not provided', async () => {
      const pageOptions = { page: 1, limit: 10 };
      const paginatedResponse = {
        data: [mockCliente],
        meta: {
          page: 1,
          limit: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
      jest.spyOn(service, 'findAll').mockResolvedValue(paginatedResponse);
      
      const result = await controller.findAll(pageOptions);
      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(pageOptions);
    });
  });

  describe('findOne', () => {
    it('should find a cliente by id', async () => {
      const id = 1;
      const result = await controller.findOne(id);
      expect(result).toEqual(mockCliente);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });

    it('should handle service errors', async () => {
      const id = 1;
      jest.spyOn(service, 'findOne').mockRejectedValue(new Error());
      await expect(controller.findOne(id)).rejects.toThrow();
    });
  });

  describe('findByCnpj', () => {
    it('should find a cliente by CNPJ', async () => {
      const cnpj = '12.345.678/0001-90';
      const result = await controller.findByCnpj(cnpj);
      expect(result).toEqual(mockCliente);
      expect(service.findByCnpj).toHaveBeenCalledWith(cnpj);
    });

    it('should handle service errors', async () => {
      const cnpj = '12.345.678/0001-90';
      jest.spyOn(service, 'findByCnpj').mockRejectedValue(new Error());
      await expect(controller.findByCnpj(cnpj)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a cliente', async () => {
      const id = 1;
      const updateDto: UpdateClienteDto = {
        nome_fantasia: 'Empresa Atualizada',
      };

      const result = await controller.update(id, updateDto);
      expect(result).toEqual(mockCliente);
      expect(service.update).toHaveBeenCalledWith(id, updateDto);
    });

    it('should handle service errors', async () => {
      const id = 1;
      const updateDto: UpdateClienteDto = {
        nome_fantasia: 'Empresa Atualizada',
      };

      jest.spyOn(service, 'update').mockRejectedValue(new Error());
      await expect(controller.update(id, updateDto)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a cliente', async () => {
      const id = 1;
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should handle service errors', async () => {
      const id = 1;
      jest.spyOn(service, 'remove').mockRejectedValue(new Error());
      await expect(controller.remove(id)).rejects.toThrow();
    });
  });
});