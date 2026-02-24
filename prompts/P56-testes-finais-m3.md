# P56 — Testes Finais: Tenant Isolation E2E + Validação M3

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. F3 concluído (portal catálogo, pedidos, detalhe). 301 testes.

**Objetivo:** Testes de integração/e2e que validam o fluxo completo: registro → aprovação → login → acesso portal → criar pedido → tenant isolation cross-client. Este é o prompt final do M3.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -5
yarn workspace backend test 2>&1 | tail -5
```

Garantir 301 testes passando e working tree limpa.

## TAREFA 1 — Testes de Integração: Fluxo Completo de Registro

Criar `packages/backend/src/auth/auth.integration.spec.ts` (ou nome adequado ao padrão existente):

### Cenário: Registro → Aprovação → Login
```
1. POST /auth/registrar-cliente com dados válidos
   → 201, retorna clienteId
   → Cliente criado com status pendente_aprovacao
   → Usuario criado com status inativo

2. POST /auth/login com credenciais do novo usuario
   → 401 "aguardando aprovação" (bloqueado)

3. PATCH /clientes/:id/aprovar (como ADMIN)
   → Cliente status → ativo
   → Usuario status → ativo

4. POST /auth/login com credenciais do novo usuario
   → 200, retorna JWT com clienteId preenchido
   → JWT decodificado contém papelTipo: 'CLIENTE'
```

### Cenário: Registro com CNPJ duplicado
```
1. POST /auth/registrar-cliente (empresa A)
   → 201 sucesso
2. POST /auth/registrar-cliente (mesmo CNPJ)
   → 409 Conflict
```

### Cenário: Registro com email duplicado
```
1. POST /auth/registrar-cliente (usuario@email.com)
   → 201 sucesso
2. POST /auth/registrar-cliente (mesmo email, CNPJ diferente)
   → 409 Conflict
```

### Cenário: Rejeição
```
1. POST /auth/registrar-cliente
2. PATCH /clientes/:id/rejeitar com motivo
3. POST /auth/login → 401 "rejeitado"
```

## TAREFA 2 — Testes de Tenant Isolation Cross-Client

Criar `packages/backend/src/pedidos/pedidos.tenant.spec.ts` (ou nome adequado):

### Setup: Dois clientes com pedidos
```
- Cliente A (aprovado) com Usuario A (CLIENTE_ADMIN)
- Cliente B (aprovado) com Usuario B (CLIENTE_ADMIN)
- Pedido X pertence ao Cliente A
- Pedido Y pertence ao Cliente B
- Admin interno (ADMIN)
```

### Cenários de Isolamento

```
✓ Usuario A GET /pedidos → vê apenas Pedido X (não vê Y)
✓ Usuario B GET /pedidos → vê apenas Pedido Y (não vê X)
✓ Admin GET /pedidos → vê Pedido X e Y (todos)

✓ Usuario A GET /pedidos/:idY → 403 Forbidden (pedido de outro cliente)
✓ Usuario B GET /pedidos/:idX → 403 Forbidden

✓ Usuario A PATCH /pedidos/:idY/status → 403 Forbidden
✓ Usuario B PATCH /pedidos/:idX/status → 403 Forbidden

✓ Usuario A POST /pedidos → pedido criado com cliente_id de A (do JWT)
✓ Usuario A POST /pedidos com cliente_id de B no body → ignora, usa JWT

✓ Usuario A GET /clientes/:idB → 403 Forbidden (cliente de outro tenant)
✓ Usuario A GET /clientes → vê apenas Cliente A
✓ Admin GET /clientes → vê todos
```

### Cenário: created_by
```
✓ Usuario A cria pedido → created_by = id do Usuario A
✓ Admin cria pedido para Cliente A → created_by = id do Admin
```

## TAREFA 3 — Testes de Transição de Status por Papel

Criar ou expandir `packages/backend/src/pedidos/pedidos.status.spec.ts`:

```
✓ CLIENTE pode: RASCUNHO → PENDENTE
✓ CLIENTE pode: RASCUNHO → CANCELADO
✓ CLIENTE pode: PENDENTE → CANCELADO
✓ CLIENTE NÃO pode: PENDENTE → CONFIRMADO (403 ou 400)
✓ CLIENTE NÃO pode: CONFIRMADO → EM_PRODUCAO (403 ou 400)

✓ INTERNO pode: PENDENTE → CONFIRMADO
✓ INTERNO pode: CONFIRMADO → EM_PRODUCAO
✓ INTERNO pode: EM_PRODUCAO → PRONTO
✓ INTERNO pode: PRONTO → ENTREGUE
✓ INTERNO pode: qualquer (não-final) → CANCELADO

✓ Ninguém pode: ENTREGUE → qualquer (estado final)
✓ Ninguém pode: CANCELADO → qualquer (estado final)
✓ Transição inválida → BadRequestException com mensagem descritiva
```

## TAREFA 4 — Testes de Bloqueio de Login por Status

Expandir testes em `auth.service.spec.ts` (se não cobertos pelo P49):

```
✓ Cliente pendente_aprovacao → login bloqueado
✓ Cliente rejeitado → login bloqueado
✓ Cliente suspenso → login bloqueado
✓ Cliente ativo + usuario ativo → login OK
✓ Usuario inativo (qualquer motivo) → login bloqueado
✓ Refresh token de usuario com cliente pendente → bloqueado
```

## TAREFA 5 — Verificação de Integridade

### Rodar todos os testes
```bash
yarn workspace backend test
```
**Target: ≥320 testes** (301 baseline + ~19-25 novos)

### Verificar build completo
```bash
yarn workspace frontend build
yarn workspace backend build
```
Ambos sem erros.

### Verificar cobertura (se configurado)
```bash
yarn workspace backend test --coverage
```
Reportar cobertura das áreas críticas: auth, pedidos, clientes.

## TAREFA 6 — Commit Final M3

Se todos os testes passam e builds estão limpos:

```bash
git add -A
git commit -m "test(m3): testes e2e tenant isolation, fluxo registro, transições status"
```

### Opcional: Tag de milestone
```bash
git tag m3-portal-cliente
```

## CRITÉRIOS DE SUCESSO (GATE M3 FINAL)

### Funcionalidade
- [ ] Portal do cliente funcional (catálogo, pedidos, detalhe)
- [ ] Auto-cadastro com aprovação funcionando
- [ ] 7 estados de pedido com transições validadas
- [ ] Tenant isolation comprovada por testes

### Testes
- [ ] ≥320 testes passando
- [ ] Nenhum teste existente quebrado
- [ ] Fluxo registro→aprovação→login coberto
- [ ] Cross-tenant isolation coberto (cliente A ✗ dados cliente B)
- [ ] Transições de status por papel cobertas
- [ ] Bloqueio de login por status coberto

### Build
- [ ] Backend build sem erros
- [ ] Frontend build sem erros (todas as rotas)

### Segurança
- [ ] CLIENTE não acessa dados de outro CLIENTE
- [ ] CLIENTE não faz transições reservadas a INTERNO
- [ ] Login bloqueado para pendentes/rejeitados/suspensos
- [ ] created_by rastreável em pedidos

## NOTAS IMPORTANTES

- **Este prompt é majoritariamente testes backend.** Modificações de código só se necessário para corrigir bugs encontrados.
- **Se algum teste revelar um bug**, corrigir o bug E adicionar o teste. Documentar o bug corrigido no commit.
- **Usar o padrão de teste existente** no projeto (Jest, mocks do Prisma, etc.).
- **Testes de integração** podem precisar de setup mais elaborado (criar usuarios, clientes, pedidos no banco de teste). Verificar como os testes existentes fazem setup.
- **Se testes de integração HTTP (supertest)** já existem no projeto, seguir o padrão. Se não, testes unitários com mocks são suficientes.
- **Priorizar testes de tenant isolation** — é a feature de segurança mais crítica do M3.
