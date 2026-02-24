# P45 — Route Groups + Layouts Isolados + Nav Dinâmica

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. M3 F0 em andamento. P43 concluído (TenantGuard, JWT clienteId, 241 testes).

**Objetivo:** Separar a UI em duas experiências — admin interno e portal cliente — usando App Router route groups no mesmo app Next.js.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -5
yarn workspace backend test 2>&1 | tail -10
```

Garantir 241 testes passando e working tree limpa antes de começar.

## TAREFA 1 — Criar Route Groups

Reorganizar `packages/frontend/src/app/` em dois route groups:

```
src/app/
├── (admin)/           ← telas internas (operadores, gerentes, admin)
│   ├── layout.tsx     ← AdminLayout (sidebar fixa, nav completa)
│   ├── dashboard/
│   │   └── page.tsx   ← dashboard admin (mover de /dashboard)
│   ├── clientes/
│   │   └── page.tsx   ← gestão clientes (mover de /clientes)
│   ├── produtos/
│   │   └── page.tsx   ← gestão produtos (mover de /produtos)
│   ├── pedidos/
│   │   ├── page.tsx   ← gestão pedidos (mover de /pedidos)
│   │   └── [id]/
│   │       └── page.tsx
│   └── usuarios/
│       └── page.tsx   ← gestão usuários (mover de /usuarios)
│
├── (portal)/          ← telas do cliente externo
│   ├── layout.tsx     ← PortalLayout (nav simplificada, branding cliente)
│   └── portal/
│       └── dashboard/
│           └── page.tsx  ← placeholder "Bem-vindo ao Portal" (simples)
│
├── layout.tsx         ← RootLayout (mantém — providers globais, html/body)
├── page.tsx           ← landing/redirect (mantém ou adapta)
├── login/
│   └── page.tsx       ← login (mantém — compartilhado)
├── esqueci-senha/
│   └── page.tsx       ← (mantém — compartilhado)
└── reset-senha/
    └── page.tsx       ← (mantém — compartilhado)
```

### Regras da migração:

1. **Route groups `(admin)` e `(portal)` NÃO afetam a URL.** `/dashboard` continua sendo `/dashboard`, não `/(admin)/dashboard`. Isso é feature nativa do App Router.

2. **Mover arquivos existentes** para dentro de `(admin)/`. Não reescrever — apenas mover e ajustar imports se necessário.

3. **Login, esqueci-senha, reset-senha** ficam fora dos route groups — são páginas públicas/compartilhadas.

4. **RootLayout** (`src/app/layout.tsx`) deve ser simplificado: apenas `<html>`, `<body>`, providers globais (AuthProvider, QueryClient, etc.). Sem sidebar, sem nav — isso vai para os layouts dos route groups.

5. **Se existir um `ClientLayout` wrapper** no layout atual, extrair a lógica de sidebar/nav dele para o `AdminLayout`.

## TAREFA 2 — AdminLayout

Criar `packages/frontend/src/app/(admin)/layout.tsx`:

```tsx
// Layout com sidebar fixa + header + nav completa para papéis INTERNOS
// Reutilizar componentes existentes (Navigation, sidebar, etc.)
// Deve verificar autenticação — redirecionar para /login se não autenticado
// Deve verificar papel — redirecionar para /portal/dashboard se papel CLIENTE_*
```

**Requisitos:**
- Sidebar com navegação completa (Dashboard, Clientes, Produtos, Pedidos, Usuários)
- Header com nome do usuário e botão logout
- Responsivo (sidebar colapsável em mobile se já existir)
- Reutilizar componentes existentes ao máximo — não reescrever do zero

## TAREFA 3 — PortalLayout

Criar `packages/frontend/src/app/(portal)/layout.tsx`:

```tsx
// Layout simplificado para clientes externos
// Header com logo + nome da empresa do cliente + logout
// Nav horizontal simples (sem sidebar pesada)
// Deve verificar autenticação — redirecionar para /login se não autenticado
// Deve verificar papel — redirecionar para /dashboard se papel INTERNO
```

**Requisitos:**
- Header limpo com logo "Lino's Panificadora" + nome do cliente
- Nav horizontal: Dashboard, Catálogo, Pedidos (itens futuros P53-P55)
- Sem sidebar — experiência mais leve que o admin
- Footer simples opcional

## TAREFA 4 — Página Placeholder Portal

Criar `packages/frontend/src/app/(portal)/portal/dashboard/page.tsx`:

```tsx
// Página simples: "Bem-vindo ao Portal do Cliente"
// Mostra nome da empresa (do contexto de auth)
// Cards placeholder: "Catálogo" e "Meus Pedidos" (links futuros)
// Estilo consistente com PortalLayout
```

**URL final:** `/portal/dashboard` (o `(portal)` é route group invisível na URL)

## TAREFA 5 — Nav Dinâmica por Papel

Implementar lógica de redirecionamento pós-login baseada no tipo de papel:

### No fluxo de login (`/login/page.tsx` ou hook de auth):

```
Após login bem-sucedido:
  Se papelTipo === 'INTERNO' → redirect para /dashboard
  Se papelTipo === 'CLIENTE' → redirect para /portal/dashboard
```

### Proteção de rotas:

```
Usuário INTERNO tentando acessar /portal/* → redirect para /dashboard
Usuário CLIENTE tentando acessar /* (admin) → redirect para /portal/dashboard
Usuário não autenticado em qualquer rota protegida → redirect para /login
```

**ATENÇÃO:** O `papelTipo` (INTERNO/CLIENTE) agora está no JWT (implementado P43). Verificar como o frontend acessa os dados do usuário autenticado (contexto, hook, localStorage do token decodificado) e usar a mesma abordagem.

## TAREFA 6 — Ajustar imports e referências

Após mover os arquivos:

1. Verificar todos os imports relativos quebrados
2. Atualizar referências a componentes movidos
3. Verificar que o `next.config.js` não tem paths hardcoded
4. Testar navegação manual: `/login` → `/dashboard` → `/clientes` → `/pedidos` → `/produtos` → `/usuarios`

## TAREFA 7 — Testes

### Verificar testes backend (não devem ser afetados)
```bash
yarn workspace backend test
```
Target: 241 testes passando (nenhuma mudança backend neste prompt)

### Verificar build frontend
```bash
yarn workspace frontend build
```
Target: Build sem erros

### Verificar navegação (manual ou com dev server)
```bash
yarn workspace frontend dev
```
- `/login` → acessível
- `/dashboard` → redireciona para login se não autenticado
- `/portal/dashboard` → acessível com placeholder

## CRITÉRIOS DE SUCESSO

- [ ] Route groups `(admin)` e `(portal)` criados
- [ ] Todas as rotas admin existentes movidas para `(admin)/`
- [ ] AdminLayout com sidebar e nav completa funcionando
- [ ] PortalLayout com header e nav horizontal criado
- [ ] Placeholder `/portal/dashboard` acessível
- [ ] Redirect pós-login por papelTipo funcionando
- [ ] Proteção de rotas cross-papel funcionando
- [ ] RootLayout simplificado (sem sidebar/nav duplicada)
- [ ] Backend: 241 testes passando (inalterado)
- [ ] Frontend: build sem erros
- [ ] Nenhum import quebrado
- [ ] URLs existentes continuam funcionando (route groups não alteram URLs)

## NOTAS IMPORTANTES

- **Este prompt é 100% frontend.** Não modificar nada no backend.
- **Route groups são invisíveis na URL.** `(admin)/dashboard/page.tsx` = `/dashboard`. `(portal)/portal/dashboard/page.tsx` = `/portal/dashboard`.
- **Reutilizar componentes existentes.** Se existe Navigation.tsx, ClientLayout.tsx, etc., mover/adaptar — não reescrever do zero.
- **Se o layout atual é monolítico** (tudo em um RootLayout com sidebar condicional), refatorar para separar em AdminLayout + PortalLayout.
- **Não criar páginas do portal ainda** (catálogo, pedidos) — são P53-P55. Só o dashboard placeholder.
- **Commitar ao final** com: `feat(m3): route groups (admin)/(portal), layouts isolados, nav dinâmica por papel`
