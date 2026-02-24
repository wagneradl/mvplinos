# P64 — Sub-usuários: Página Portal Frontend

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 396 testes passando (commit `28842c8`).

**Objetivo:** Criar página `/portal/usuarios` para que CLIENTE_ADMIN gerencie sub-usuários (CLIENTE_USUARIO) da sua empresa. Backend já tem tenant isolation completa (P63): força `cliente_id` do JWT, restringe papel por tipo/nível, valida pertencimento.

**Backend disponível (tenant-isolated):**
- `GET /usuarios` → lista usuários do cliente (TenantGuard)
- `POST /usuarios` → cria CLIENTE_USUARIO (força `cliente_id`, valida papel)
- `GET /usuarios/:id` → detalhe (valida pertencimento)
- `PATCH /usuarios/:id` → edita (valida pertencimento)
- `DELETE /usuarios/:id` → desativa (valida pertencimento, não pode desativar a si mesmo ou outro admin)
- `GET /usuarios/papeis?tipo=CLIENTE` → papéis disponíveis para o portal

**Frontend existente (reutilizar):**
- `UsuariosService` em `services/usuarios.service.ts` (listar, criar, atualizar, deletar, reativar, listarPapeis)
- `useUsuarios` hook em `hooks/useUsuarios.ts` (CRUD + mutations com React Query)
- `usePapeis` hook (lista papéis)
- Portal layout com array `portalMenuItems` em `app/(portal)/layout.tsx`
- Pattern de páginas portal: `PageContainer`, tabela, dialog, `EmptyState`, `ErrorState`

**Referência:** `prompts/P57-diagnostico-m4.md` Seção 3 (E3).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 396 testes passando, working tree limpa.

## TAREFA 1 — Atualizar Service para Filtro de Papéis

### 1.1 Adicionar parâmetro ao listarPapeis

Em `packages/frontend/src/services/usuarios.service.ts`:

```typescript
async listarPapeis(tipo?: string): Promise<Papel[]> {
  const params = tipo ? { tipo } : {};
  const response = await api.get<Papel[]>('/usuarios/papeis', { params });
  return response.data;
}
```

### 1.2 Atualizar usePapeis hook

Em `packages/frontend/src/hooks/useUsuarios.ts`:

```typescript
export function usePapeis(tipo?: string) {
  // ...
  queryFn: () => UsuariosService.listarPapeis(tipo),
  queryKey: ['papeis', tipo],
  // ...
}
```

## TAREFA 2 — Página de Listagem `/portal/usuarios`

### 2.1 Criar página

Criar `packages/frontend/src/app/(portal)/portal/usuarios/page.tsx`:

**Visibilidade:** Esta página só deve ser acessível por CLIENTE_ADMIN. Verificar `usuario.papel.codigo` no AuthContext. Se CLIENTE_USUARIO, redirecionar para `/portal/dashboard` ou mostrar mensagem de acesso negado.

**Layout:**
1. `PageContainer` com título "Minha Equipe"
2. Botão "Novo Usuário" no canto superior direito (abre dialog de criação)
3. Tabela com colunas:
   - Nome
   - Email
   - Papel (chip: "Administrador" ou "Usuário")
   - Status (chip colorido: ativo/inativo)
   - Ações (editar, desativar/reativar)

4. Cada linha mostra um sub-usuário. O CLIENTE_ADMIN logado NÃO aparece na lista (ou aparece mas sem botão de desativar, com indicador "Você").

**Estados:**
- Loading: Skeleton
- Erro: ErrorState com retry
- Vazio: EmptyState com "Nenhum usuário cadastrado. Convide sua equipe!"

### 2.2 Dialog de criação

Dialog MUI com formulário:
- **Nome** (TextField, obrigatório)
- **Email** (TextField, obrigatório, validação email)
- **Senha** (TextField, obrigatório, type password, mínimo 6 chars)
- **Papel** (Select, buscar de `usePapeis('CLIENTE')` — na prática só mostrará CLIENTE_USUARIO)

Ao submeter: chamar `criarUsuario()` do `useUsuarios` hook.
Após sucesso: fechar dialog, lista atualiza via React Query invalidation.

**NÃO incluir campo `cliente_id`** — o backend força do JWT automaticamente.

### 2.3 Dialog de edição

Dialog similar ao de criação, mas:
- Pré-preenchido com dados do usuário selecionado
- Senha opcional (vazio = não alterar)
- Papel pode ser alterado (mas backend vai validar)
- Ao submeter: chamar `atualizarUsuario()` do hook

### 2.4 Ação desativar/reativar

- Botão de desativar: confirmation dialog ("Tem certeza que deseja desativar {nome}?")
- Ao confirmar: chamar `deletarUsuario()` (soft delete)
- Usuário desativado: mostrar botão de reativar
- Ao reativar: chamar `reativarUsuario()`
- **NÃO mostrar botão de desativar** para o próprio CLIENTE_ADMIN logado
- **NÃO mostrar botão de desativar** para outros CLIENTE_ADMIN (se existirem)

## TAREFA 3 — Adicionar na Navegação do Portal

### 3.1 Adicionar item no menu (condicional)

Em `packages/frontend/src/app/(portal)/layout.tsx`:

Adicionar "Minha Equipe" no array `portalMenuItems`, mas **apenas visível para CLIENTE_ADMIN**.

Opções de implementação:
- **Opção A (preferida):** Tornar `portalMenuItems` dinâmico baseado no papel do usuário. Ícone: `People` ou `Group` do MUI.
- **Opção B:** Manter estático e esconder via CSS/condicional no render.

Posição: entre "Relatórios" e o logout.

### 3.2 Verificar permissão no AuthContext

Se CLIENTE_USUARIO não tem `usuarios:listar` nas permissões, o link não deve aparecer na nav. Usar `hasPermission('usuarios', 'listar')` do AuthContext se disponível.

## TAREFA 4 — Tratamento de Erros Específicos

### 4.1 Erros do backend

O backend agora retorna erros específicos:
- `ForbiddenException('Sem permissão para criar usuários com este papel')` → mostrar snackbar de erro
- `ConflictException('E-mail já cadastrado')` → mostrar no formulário
- `ForbiddenException('Acesso negado a este usuário')` → mostrar snackbar

O hook `useUsuarios` já tem `onError` com snackbar. Verificar se a mensagem do backend está sendo extraída corretamente (pode vir em `error.response.data.message`).

### 4.2 Melhorar extração de mensagem de erro

Se necessário, ajustar o `onError` nos mutations do `useUsuarios` para extrair `error.response?.data?.message` ao invés de `error.message`.

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes backend (não devem quebrar)
yarn workspace backend test 2>&1 | tail -5

# 2. Build frontend
yarn workspace frontend build 2>&1 | tail -10

# 3. Verificação visual (se dev server disponível)
# - Login como CLIENTE_ADMIN → ver "Minha Equipe" na nav
# - Login como CLIENTE_USUARIO → NÃO ver "Minha Equipe"
# - Navegar para /portal/usuarios → ver listagem
# - Criar sub-usuário → confirmar na listagem
# - Editar sub-usuário → confirmar alteração
# - Desativar sub-usuário → confirmar status

# 4. Git
git add -A
git status
git commit -m "feat(portal): sub-user management page for CLIENTE_ADMIN

- New /portal/usuarios page: list, create, edit, deactivate/reactivate
- Create/edit dialogs with papel filter (CLIENTE type only)
- Conditional nav: 'Minha Equipe' visible only to CLIENTE_ADMIN
- Error handling for backend restrictions (ForbiddenException, ConflictException)
- Reuses useUsuarios hook and UsuariosService

refs: M4-F3, E3-frontend"
```

## CONTAGEM ESPERADA

- Testes backend: 396 (sem alteração)
- Frontend: sem testes unitários
- **Meta: 396 testes passando, frontend build green**

## RESTRIÇÕES

- NÃO alterar backend — este prompt é 100% frontend
- NÃO alterar seed ou migrations
- NÃO enviar `cliente_id` no body de criação (backend força do JWT)
- NÃO permitir CLIENTE_USUARIO acessar esta página
- NÃO criar testes frontend
- Reutilizar hook `useUsuarios` e service existentes
