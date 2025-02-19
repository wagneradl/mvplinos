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
  });

  describe('findAll', () => {
    it('should return an array of clientes', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockCliente]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a cliente by id', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual(mockCliente);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('findByCnpj', () => {
    it('should return a cliente by CNPJ', async () => {
      const result = await controller.findByCnpj('12.345.678/0001-90');
      expect(result).toEqual(mockCliente);
      expect(service.findByCnpj).toHaveBeenCalledWith('12.345.678/0001-90');
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
  });

  describe('remove', () => {
    it('should remove a cliente', async () => {
      await controller.remove(1);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});