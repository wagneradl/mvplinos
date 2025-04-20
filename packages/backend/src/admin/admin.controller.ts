import { Controller, Post, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequerPermissoes } from '../auth/decorators/requer-permissoes.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('seed')
  @RequerPermissoes('usuarios', 'write')
  async executeSeed() {
    return this.adminService.executeSeed();
  }

  @Post('reset-database')
  @RequerPermissoes('usuarios', 'delete')
  async resetDatabase(@Headers('authorization') authorization: string) {
    // Verificação adicional de segurança - apenas para admin
    if (!authorization) {
      throw new UnauthorizedException('Token não fornecido');
    }
    
    return this.adminService.resetDatabase();
  }
}
