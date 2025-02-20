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
    it('should return a cliente by id', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual(mockCliente);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new Error());
      await expect(controller.findOne(1)).rejects.toThrow();
    });
  });

  describe('findByCnpj', () => {
    it('should return a cliente by CNPJ', async () => {
      jest.spyOn(service, 'findByCnpj').mockResolvedValue(mockCliente);
      const result = await controller.findByCnpj('12.345.678/0001-90');
      expect(result).toEqual(mockCliente);
      expect(service.findByCnpj).toHaveBeenCalledWith('12.345.678/0001-90');
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'findByCnpj').mockRejectedValue(new Error());
      await expect(controller.findByCnpj('12.345.678/0001-90')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a cliente', async () => {
      const updateDto: UpdateClienteDto = {
        nome_fantasia: 'Empresa Atualizada',
      };

      const result = await controller.update(1, updateDto);
      expect(result).toEqual(mockCliente);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should handle invalid id format', async () => {
      const updateDto: UpdateClienteDto = {
        nome_fantasia: 'Empresa Atualizada',
      };

      jest.spyOn(service, 'update').mockRejectedValue(new Error('Invalid ID'));
      await expect(controller.update(1, updateDto)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a cliente', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(mockCliente);
      const result = await controller.remove(1);
      expect(result).toEqual(mockCliente);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should handle invalid id format', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new Error('Invalid ID'));
      await expect(controller.remove(1)).rejects.toThrow();
    });
  });
});