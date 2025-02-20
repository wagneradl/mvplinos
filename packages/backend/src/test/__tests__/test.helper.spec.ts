import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TestHelper } from '../test.helper';
import { TestModule } from '../test.module';

describe('TestHelper', () => {
  let module: TestingModule;
  let app: INestApplication;

  beforeAll(async () => {
    module = await TestHelper.createTestingModule([]);
    app = await TestHelper.createTestingApp(module);
  });

  afterAll(async () => {
    await TestHelper.closeApp(app);
  });

  describe('createTestingModule', () => {
    it('should create a testing module with imports', async () => {
      const testModule = await TestHelper.createTestingModule([]);
      expect(testModule).toBeDefined();
    });
  });

  describe('createTestingApp', () => {
    it('should create and initialize a NestJS application', async () => {
      const testApp = await TestHelper.createTestingApp(module);
      expect(testApp).toBeDefined();
      await testApp.close();
    });
  });

  describe('getPrismaTestService', () => {
    it('should get PrismaService from module', () => {
      const prismaService = TestHelper.getPrismaTestService(module);
      expect(prismaService).toBeDefined();
    });
  });

  describe('cleanupDatabase', () => {
    it('should call cleanDatabase on PrismaService', async () => {
      const prismaService = TestHelper.getPrismaTestService(module);
      const cleanDatabaseSpy = jest.spyOn(prismaService, 'cleanDatabase');
      
      await TestHelper.cleanupDatabase(module);
      
      expect(cleanDatabaseSpy).toHaveBeenCalled();
    });
  });

  describe('closeApp', () => {
    it('should close the NestJS application', async () => {
      const testApp = await TestHelper.createTestingApp(module);
      const closeSpy = jest.spyOn(testApp, 'close');
      
      await TestHelper.closeApp(testApp);
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
