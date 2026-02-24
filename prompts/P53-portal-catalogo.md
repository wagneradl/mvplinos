# P53 — Portal: Catálogo de Produtos (readonly)

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. F2 concluído (auto-cadastro + aprovação, 301 testes).

**Objetivo:** Criar página de catálogo no portal do cliente — grid visual readonly dos produtos ativos da panificadora. Cliente navega, visualiza detalhes, mas não edita. Base para criação de pedidos (P54).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 301 testes passando e working tree limpa.

## TAREFA 1 — Página /portal/catalogo

Criar `packages/frontend/src/app/(portal)/portal/catalogo/page.tsx`:

### Layout
- Título: "Catálogo de Produtos"
- Grid responsivo de cards (3 colunas desktop, 2 tablet, 1 mobile)
- Cada card mostra um produto ativo

### Card do Produto
```
┌─────────────────────────┐
│  [Imagem placeholder]   │  ← se não tiver imagem, placeholder com ícone/cor
│                         │
│  Pão Francês            │  ← nome
│  Categoria: Pães        │  ← categoria (se existir no modelo)
│                         │
│  R$ 0,50 /unidade       │  ← preço + unidade de medida
│                         │
│  [Ver Detalhes]         │  ← botão ou link (abre modal/expande)
└─────────────────────────┘
```

**ATENÇÃO:** Verificar o modelo `Produto` no schema.prisma para saber quais campos existem (nome, preco, descricao, unidade_medida, categoria, imagem_url, ativo, etc.). Adaptar o card conforme os campos reais.

### Busca e Filtros
- Campo de busca por nome do produto (filter client-side ou debounced API)
- Filtro por categoria (se categorias existirem no modelo)
- Ordenação: A-Z, preço crescente/decrescente

### Dados
- Chamar `GET /produtos` (endpoint já existe)
- Filtrar apenas produtos ativos (verificar se o backend já filtra ou se precisa query param)
- Se o endpoint retorna produtos inativos também, filtrar client-side ou adicionar `?ativo=true`

## TAREFA 2 — Modal/Drawer de Detalhes

Ao clicar "Ver Detalhes" no card:

### Opção A (preferida): Modal/Dialog
```
┌──────────────────────────────────┐
│  Pão Francês                  X  │
│                                  │
│  [Imagem grande placeholder]     │
│                                  │
│  Descrição:                      │
│  Pão crocante por fora, macio    │
│  por dentro. Peso aprox. 50g.    │
│                                  │
│  Categoria: Pães                 │
│  Unidade: unidade                │
│  Preço: R$ 0,50                  │
│                                  │
│  [Fechar]                        │
└──────────────────────────────────┘
```

### Opção B: Expandir card (se mais simples)

Escolher a opção que melhor se integra com o design existente (MUI Dialog provavelmente).

**Nota:** Sem botão "Adicionar ao pedido" neste prompt. Isso vem no P54 junto com a criação de pedidos.

## TAREFA 3 — Atualizar PortalLayout Navigation

No `(portal)/layout.tsx`, o item "Catálogo" na nav horizontal deve apontar para `/portal/catalogo`:

- Dashboard: `/portal/dashboard`
- **Catálogo: `/portal/catalogo`** ← ativo neste prompt
- Meus Pedidos: `/portal/pedidos` ← será P54

Verificar se o PortalLayout (P45) já tem esses links. Se sim, apenas garantir que `/portal/catalogo` está correto. Se não, adicionar.

## TAREFA 4 — Estado Vazio

Se não houver produtos cadastrados:
```
📦 Nenhum produto disponível no momento.
Nosso catálogo está sendo atualizado.
```

## TAREFA 5 — Validação

### Build frontend
```bash
yarn workspace frontend build
```

### Backend (não deve ser afetado)
```bash
yarn workspace backend test
```
Target: 301 testes passando (inalterado)

### Verificação visual
- `/portal/catalogo` acessível para usuários CLIENTE
- Grid de produtos renderiza com cards
- Busca por nome funciona
- Modal de detalhes abre e mostra informações
- Estado vazio aparece se sem produtos
- Nav do portal destaca "Catálogo" como ativo

## CRITÉRIOS DE SUCESSO

- [ ] Página `/portal/catalogo` criada dentro do route group (portal)
- [ ] Grid responsivo de cards de produtos
- [ ] Cards mostram: nome, preço, unidade, categoria (campos disponíveis)
- [ ] Busca por nome funcionando
- [ ] Modal/drawer de detalhes do produto
- [ ] Apenas produtos ativos exibidos
- [ ] Estado vazio tratado
- [ ] Nav do portal com link ativo para catálogo
- [ ] Backend: 301 testes (inalterado)
- [ ] Frontend: build sem erros
- [ ] Design consistente com PortalLayout

## NOTAS IMPORTANTES

- **Não modificar backend.** GET /produtos já existe e é acessível.
- **Catálogo é readonly.** Cliente não cria/edita/deleta produtos.
- **Sem "adicionar ao pedido"** neste prompt — isso é P54.
- **Produtos são globais** (sem tenant filter). Todos os clientes veem o mesmo catálogo.
- **Verificar modelo Produto** no schema.prisma para campos reais antes de montar o card.
- **Se não existir campo de imagem** no modelo, usar placeholder com inicial do nome ou ícone genérico.
- **Commitar ao final** com: `feat(m3): portal catálogo de produtos readonly`
