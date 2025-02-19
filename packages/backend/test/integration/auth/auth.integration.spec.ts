import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { AuthService } from '../../../src/auth/auth.service';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);

    await app.init();
  });

  beforeEach(async () => {
    // Limpa a tabela de usuários antes de cada teste
    await prismaService.usuario.deleteMany();
  });

  afterAll(async () => {
    await prismaService.usuario.deleteMany();
    await prismaService.$disconnect();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'test@example.com',
        senha: 'password123',
        nome: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.nome).toBe(newUser.nome);
      expect(response.body).not.toHaveProperty('senha');
    });

    it('should not allow duplicate email', async () => {
      const user = {
        email: 'test@example.com',
        senha: 'password123',
        nome: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = {
        email: 'test@example.com',
        senha: 'password123',
        nome: 'Test User',
      };

      // Registra o usuário
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user);

      // Tenta fazer login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          senha: user.senha,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
    });

    it('should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          senha: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let userToken: string;

    beforeEach(async () => {
      // Cria um usuário e obtém o token
      const user = {
        email: 'test@example.com',
        senha: 'password123',
        nome: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          senha: user.senha,
        });

      userToken = loginResponse.body.access_token;
    });

    // Teste de exemplo em uma rota protegida (produtos)
    it('should access protected route with valid token', async () => {
      await request(app.getHttpServer())
        .get('/produtos')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should fail to access protected route without token', async () => {
      await request(app.getHttpServer())
        .get('/produtos')
        .expect(401);
    });

    it('should fail to access protected route with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/produtos')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});