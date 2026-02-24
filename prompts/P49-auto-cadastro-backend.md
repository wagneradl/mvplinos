# P49 — Backend: Auto-cadastro Público com Aprovação

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. F1 concluído (7 status, transições, 281 testes).

**Objetivo:** Permitir que empresas se cadastrem publicamente no sistema. O cadastro cria um Cliente com status `pendente_aprovacao` e um Usuário vinculado. Admin interno aprova/rejeita. Após aprovação, o usuário pode fazer login e acessar o portal.

**Defesas já existentes:** Rate limiting (M1), EmailService (M1), validação CNPJ.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 281 testes passando e working tree limpa.

## TAREFA 1 — Status do Cliente no Schema

Verificar o modelo `Cliente` em `packages/backend/prisma/schema.prisma`.

Adicionar campo de status (se não existir):

```prisma
model Cliente {
  // ... campos existentes ...
  status    String   @default("ativo")  // ativo, pendente_aprovacao, rejeitado, suspenso
}
```

**Se `status` já existir**, apenas garantir que aceita o valor `pendente_aprovacao`.

Migration: `npx prisma migrate dev --name add_cliente_status`

**ATENÇÃO:** Verificar se o modelo Cliente já tem campo `status` ou `ativo` (boolean). Adaptar conforme encontrado — pode ser que exista um boolean `ativo` que precisa ser expandido para string de status.

## TAREFA 2 — DTO de Registro

Criar `packages/backend/src/auth/dto/registrar-cliente.dto.ts`:

```typescript
export class RegistrarClienteDto {
  // Dados da empresa
  razao_social: string;       // obrigatório
  nome_fantasia?: string;     // opcional
  cnpj: string;               // obrigatório, validar formato
  email_empresa: string;      // obrigatório, email válido
  telefone?: string;          // opcional

  // Dados do responsável (será o CLIENTE_ADMIN)
  nome_responsavel: string;   // obrigatório
  email_responsavel: string;  // obrigatório, email válido
  senha: string;              // obrigatório, min 8 chars
}
```

**Validações:**
- CNPJ: formato válido (14 dígitos, com ou sem máscara)
- Emails: formato válido
- Senha: mínimo 8 caracteres
- Razão social: não vazio
- Nome responsável: não vazio
- CNPJ único (não pode já existir no banco)
- Email responsável único (não pode já existir como usuário)

Usar `class-validator` decorators se já usado no projeto, senão validar manualmente.

## TAREFA 3 — Endpoint POST /auth/registrar-cliente

No `AuthController`, criar endpoint público (sem guards de autenticação):

```typescript
@Post('registrar-cliente')
@HttpCode(201)
async registrarCliente(@Body() dto: RegistrarClienteDto) {
  return this.authService.registrarCliente(dto);
}
```

**Este endpoint é público** — acessível sem login. Rate limiting já existe (M1).

## TAREFA 4 — AuthService.registrarCliente()

Implementar criação atômica de Cliente + Usuário:

```typescript
async registrarCliente(dto: RegistrarClienteDto) {
  // 1. Validar unicidade CNPJ
  const cnpjExistente = await this.prisma.cliente.findFirst({
    where: { cnpj: dto.cnpj }
  });
  if (cnpjExistente) throw new ConflictException('CNPJ já cadastrado');

  // 2. Validar unicidade email
  const emailExistente = await this.prisma.usuario.findFirst({
    where: { email: dto.email_responsavel }
  });
  if (emailExistente) throw new ConflictException('Email já cadastrado');

  // 3. Hash da senha
  const senhaHash = await bcrypt.hash(dto.senha, 10);

  // 4. Buscar papel CLIENTE_ADMIN
  const papelClienteAdmin = await this.prisma.papel.findFirst({
    where: { codigo: 'CLIENTE_ADMIN' }  // verificar nome real no banco
  });
  if (!papelClienteAdmin) throw new InternalServerErrorException('Papel CLIENTE_ADMIN não configurado');

  // 5. Transação atômica: criar Cliente + Usuário
  const resultado = await this.prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({
      data: {
        razao_social: dto.razao_social,
        nome_fantasia: dto.nome_fantasia,
        cnpj: dto.cnpj,
        email: dto.email_empresa,
        telefone: dto.telefone,
        status: 'pendente_aprovacao',
      },
    });

    const usuario = await tx.usuario.create({
      data: {
        nome: dto.nome_responsavel,
        email: dto.email_responsavel,
        senha: senhaHash,
        papel_id: papelClienteAdmin.id,
        cliente_id: cliente.id,
        ativo: false,  // inativo até aprovação
      },
    });

    return { cliente, usuario };
  });

  // 6. Enviar email de confirmação ao solicitante
  await this.emailService.enviarEmail({
    to: dto.email_responsavel,
    subject: 'Cadastro recebido — Lino\'s Panificadora',
    text: `Olá ${dto.nome_responsavel}, seu cadastro foi recebido e está em análise. Você será notificado quando for aprovado.`,
  });

  // 7. Notificar admin (opcional, se simples)
  // Pode enviar email ao admin avisando que tem novo cadastro pendente

  return {
    message: 'Cadastro recebido com sucesso. Aguarde aprovação.',
    clienteId: resultado.cliente.id,
  };
}
```

**ATENÇÃO CRÍTICA:**
- Verificar nomes reais dos campos no modelo Cliente (pode ser `razaoSocial` camelCase vs `razao_social` snake_case)
- Verificar como o bcrypt é importado/usado no código existente
- Verificar o nome/código do papel CLIENTE_ADMIN no seed/banco
- Verificar se EmailService existe e como é injetado
- Verificar se o campo `ativo` existe no Usuario (pode ser outro mecanismo)
- **Adaptar tudo ao código existente**, os snippets são referência

## TAREFA 5 — Bloqueio de Login para Pendentes

No `AuthService.login()` (ou `validateUser()`), adicionar verificação:

```typescript
// Após validar credenciais, antes de gerar JWT:
// 1. Verificar se usuário está ativo
if (!usuario.ativo) {
  throw new UnauthorizedException('Conta aguardando aprovação');
}

// 2. Se tem cliente vinculado, verificar status do cliente
if (usuario.cliente_id) {
  const cliente = await this.prisma.cliente.findUnique({
    where: { id: usuario.cliente_id }
  });
  if (cliente?.status === 'pendente_aprovacao') {
    throw new UnauthorizedException('Empresa aguardando aprovação');
  }
  if (cliente?.status === 'rejeitado') {
    throw new UnauthorizedException('Cadastro da empresa foi rejeitado');
  }
  if (cliente?.status === 'suspenso') {
    throw new UnauthorizedException('Empresa suspensa. Entre em contato com o suporte');
  }
}
```

**Verificar se já existe** alguma verificação de `ativo` no login. Se sim, expandir. Se não, adicionar.

## TAREFA 6 — Endpoint de Aprovação/Rejeição (Admin)

Criar endpoints no `ClientesController` (protegidos por JwtAuthGuard + papel ADMIN/GERENTE):

```typescript
@Patch(':id/aprovar')
@UseGuards(JwtAuthGuard, PermissoesGuard)
// @Permissoes('ADMIN', 'GERENTE') ou equivalente
async aprovarCliente(@Param('id') id: string) {
  return this.clientesService.aprovarCliente(+id);
}

@Patch(':id/rejeitar')
@UseGuards(JwtAuthGuard, PermissoesGuard)
async rejeitarCliente(@Param('id') id: string, @Body('motivo') motivo?: string) {
  return this.clientesService.rejeitarCliente(+id, motivo);
}
```

### ClientesService:

```typescript
async aprovarCliente(id: number) {
  const cliente = await this.prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw new NotFoundException('Cliente não encontrado');
  if (cliente.status !== 'pendente_aprovacao') {
    throw new BadRequestException('Cliente não está pendente de aprovação');
  }

  // Transação: ativar cliente + ativar usuário vinculado
  await this.prisma.$transaction(async (tx) => {
    await tx.cliente.update({
      where: { id },
      data: { status: 'ativo' },
    });
    await tx.usuario.updateMany({
      where: { cliente_id: id },
      data: { ativo: true },
    });
  });

  // Email de aprovação
  // Buscar usuario vinculado para enviar email
  const usuarios = await this.prisma.usuario.findMany({
    where: { cliente_id: id }
  });
  for (const u of usuarios) {
    await this.emailService.enviarEmail({
      to: u.email,
      subject: 'Cadastro aprovado — Lino\'s Panificadora',
      text: `Olá ${u.nome}, seu cadastro foi aprovado! Você já pode acessar o portal.`,
    });
  }

  return { message: 'Cliente aprovado com sucesso' };
}

async rejeitarCliente(id: number, motivo?: string) {
  // Similar mas com status 'rejeitado' e email de rejeição
  // ...
}
```

**ATENÇÃO:** Verificar como permissões são checadas nos controllers existentes. Usar o mesmo padrão (decorator, guard, etc.).

## TAREFA 7 — Testes

### Testes do registrarCliente
```
✓ Cria Cliente com status pendente_aprovacao + Usuario inativo
✓ Transação atômica (se usuario falha, cliente não é criado)
✓ CNPJ duplicado → ConflictException
✓ Email duplicado → ConflictException
✓ CNPJ inválido → BadRequestException (se validação implementada)
✓ Campos obrigatórios ausentes → BadRequestException
✓ Email de confirmação enviado
```

### Testes do bloqueio de login
```
✓ Usuario inativo → UnauthorizedException 'aguardando aprovação'
✓ Cliente pendente_aprovacao → UnauthorizedException
✓ Cliente rejeitado → UnauthorizedException
✓ Cliente ativo + usuario ativo → login normal
```

### Testes de aprovação/rejeição
```
✓ aprovarCliente muda status para ativo + ativa usuarios
✓ aprovarCliente em cliente já ativo → BadRequestException
✓ rejeitarCliente muda status para rejeitado
✓ Email de aprovação/rejeição enviado
✓ Somente ADMIN/GERENTE pode aprovar (permissão)
```

**Target:** ~300+ testes (281 baseline + ~19 novos)

## CRITÉRIOS DE SUCESSO

- [ ] Campo `status` no modelo Cliente (pendente_aprovacao, ativo, rejeitado, suspenso)
- [ ] POST /auth/registrar-cliente público funcionando
- [ ] Criação atômica Cliente + Usuario em transação
- [ ] CNPJ e email únicos validados
- [ ] Usuario criado como inativo (ativo=false)
- [ ] Login bloqueado para pendentes/rejeitados/suspensos
- [ ] PATCH /clientes/:id/aprovar ativa cliente + usuarios
- [ ] PATCH /clientes/:id/rejeitar rejeita com motivo opcional
- [ ] Emails enviados (confirmação, aprovação, rejeição)
- [ ] Todos os testes passando (~300+)
- [ ] Nenhum teste existente quebrado

## NOTAS IMPORTANTES

- **Não modificar frontend.** Frontend do auto-cadastro é P50.
- **Verificar nomes reais** dos campos, modelos, e serviços antes de implementar.
- **Rate limiting já existe** nos endpoints de auth (M1). O novo endpoint herda essa proteção.
- **EmailService já existe** (M1). Reutilizar — não criar outro.
- **Se o modelo Cliente já tem um campo boolean `ativo`**, decidir: expandir para string `status` (melhor) ou adicionar campo `status` separado mantendo `ativo` (pragmático). Preferir expandir se possível.
- **Commitar ao final** com: `feat(m3): auto-cadastro cliente com aprovação — registro público, bloqueio login, aprovação admin`
