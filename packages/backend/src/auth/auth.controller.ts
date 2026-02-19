import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';
import { SolicitarResetDto, SolicitarResetResponseDto } from './dto/solicitar-reset.dto';
import {
  ConfirmarResetDto,
  ConfirmarResetResponseDto,
  ValidarTokenResponseDto,
} from './dto/confirmar-reset.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordResetService } from './services/password-reset.service';
import { Request } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('login')
  @Throttle({ login: {} })
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter informações do usuário logado' })
  @ApiResponse({ status: 200, description: 'Informações do usuário retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async me(@Req() req: Request & { user: any }) {
    // O usuário já estará disponível no request após passar pelo guard
    return req.user;
  }

  // =========================================================================
  // ENDPOINTS DE RESET DE SENHA (públicos)
  // =========================================================================

  @Post('reset-solicitar')
  @Throttle({ reset: {} })
  @ApiOperation({
    summary: 'Solicitar redefinição de senha',
    description:
      'Envia um link de redefinição de senha para o e-mail informado. A resposta não revela se o usuário existe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação processada (sempre retorna sucesso por segurança)',
    type: SolicitarResetResponseDto,
  })
  async solicitarReset(@Body() dto: SolicitarResetDto): Promise<SolicitarResetResponseDto> {
    return this.passwordResetService.solicitarReset(dto.email);
  }

  @Get('reset-validar/:token')
  @Throttle({ login: {} })
  @ApiOperation({
    summary: 'Validar token de redefinição',
    description: 'Verifica se o token de redefinição é válido (existe, não expirou, não foi usado)',
  })
  @ApiParam({
    name: 'token',
    description: 'Token de redefinição recebido',
    example: 'abc123def456...',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validação do token',
    type: ValidarTokenResponseDto,
  })
  async validarToken(@Param('token') token: string): Promise<ValidarTokenResponseDto> {
    return this.passwordResetService.validarToken(token);
  }

  @Post('reset-confirmar')
  @Throttle({ login: {} })
  @ApiOperation({
    summary: 'Confirmar redefinição de senha',
    description: 'Redefine a senha do usuário usando o token válido',
  })
  @ApiResponse({
    status: 200,
    description: 'Senha redefinida com sucesso',
    type: ConfirmarResetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado ou já utilizado',
  })
  async confirmarReset(@Body() dto: ConfirmarResetDto): Promise<ConfirmarResetResponseDto> {
    return this.passwordResetService.confirmarReset(dto.token, dto.novaSenha);
  }
}
