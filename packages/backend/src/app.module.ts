import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ProdutosModule } from './produtos/produtos.module';
import { ClientesModule } from './clientes/clientes.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottleExceptionFilter } from './common/filters/throttle-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'login',
            ttl: config.get<number>('THROTTLE_LOGIN_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LOGIN_LIMIT', 5),
          },
          {
            name: 'reset',
            ttl: config.get<number>('THROTTLE_RESET_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_RESET_LIMIT', 3),
          },
        ],
      }),
    }),
    PrismaModule,
    ProdutosModule,
    ClientesModule,
    PedidosModule,
    HealthModule,
    AuthModule,
    UsuariosModule,
    AdminModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottleExceptionFilter,
    },
  ],
})
export class AppModule {}
