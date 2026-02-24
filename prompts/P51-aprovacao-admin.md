# P51 — Frontend: Tela Admin de Aprovação/Rejeição de Clientes

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. P50 concluído (página registro público, 301 testes).

**Objetivo:** Tela no admin `(admin)/` onde ADMIN/GERENTE visualiza clientes pendentes de aprovação e pode aprovar ou rejeitar, com feedback visual e notificações.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 301 testes passando e working tree limpa.

## TAREFA 1 — Atualizar Listagem de Clientes

A página existente de clientes em `(admin)/clientes/page.tsx` precisa:

### 1a — Chip de status do cliente
- Exibir status do cliente na tabela: `ativo`, `pendente_aprovacao`, `rejeitado`, `suspenso`
- Cores:
  - `ativo` → verde (chip)
  - `pendente_aprovacao` → amarelo/laranja (chip) — destaque visual
  - `rejeitado` → vermelho (chip)
  - `suspenso` → cinza (chip)

### 1b — Filtro por status
- Adicionar filtro acima da tabela (tabs ou dropdown):
  - "Todos" | "Pendentes" | "Ativos" | "Rejeitados" | "Suspensos"
- Default: mostrar "Pendentes" primeiro se houver pendentes, senão "Todos"
- Contador de pendentes como badge no tab/filtro: "Pendentes (3)"

### 1c — Indicador visual de pendentes
- Se existirem clientes pendentes, mostrar alerta/banner no topo:
  > "⚠️ X empresa(s) aguardando aprovação"
- Ou badge no menu lateral (Navigation) no item "Clientes"

## TAREFA 2 — Ações de Aprovação/Rejeição

Na tabela de clientes, para cada cliente com status `pendente_aprovacao`:

### Botão "Aprovar"
- Ícone check + texto "Aprovar"
- Cor verde
- Ao clicar: dialog de confirmação
  > "Aprovar [Razão Social]? O responsável será notificado por email e poderá acessar o portal."
  > [Cancelar] [Confirmar Aprovação]
- Chama `PATCH /clientes/:id/aprovar`
- Loading state durante chamada
- Toast/snackbar de sucesso: "Cliente aprovado com sucesso"
- Refresh da listagem após sucesso

### Botão "Rejeitar"
- Ícone X + texto "Rejeitar"
- Cor vermelha / outline
- Ao clicar: dialog com campo de motivo (opcional)
  > "Rejeitar cadastro de [Razão Social]?"
  > Motivo (opcional): [textarea]
  > [Cancelar] [Confirmar Rejeição]
- Chama `PATCH /clientes/:id/rejeitar` com body `{ motivo }`
- Loading state
- Toast de sucesso: "Cliente rejeitado"
- Refresh da listagem

### Para clientes `ativo`, `rejeitado`, `suspenso`
- Sem botões de aprovação/rejeição
- Apenas visualização normal (editar, ver detalhes se existir)

## TAREFA 3 — Detalhe do Cliente Pendente (opcional)

Se já existir uma página de detalhe do cliente `(admin)/clientes/[id]/page.tsx`:
- Mostrar todos os dados submetidos no registro
- Botões Aprovar/Rejeitar no topo
- Dados do responsável vinculado (nome, email)

Se **não existir** página de detalhe, não criar agora — as ações na tabela são suficientes. Expandir o row da tabela ou usar modal com os dados detalhados é alternativa mais leve.

## TAREFA 4 — Service/Hook Frontend

Criar ou atualizar service de clientes:

```typescript
// packages/frontend/src/services/clientes.service.ts (ou similar)
async function aprovarCliente(clienteId: number): Promise<any> {
  const response = await api.patch(`/clientes/${clienteId}/aprovar`);
  return response.data;
}

async function rejeitarCliente(clienteId: number, motivo?: string): Promise<any> {
  const response = await api.patch(`/clientes/${clienteId}/rejeitar`, { motivo });
  return response.data;
}
```

Se existir hook `useClientes`, adicionar mutations com invalidação de cache.

## TAREFA 5 — Badge no Menu (Navigation)

Se simples de implementar, adicionar badge de contagem de pendentes no item "Clientes" do menu lateral (Navigation.tsx):

```
📋 Clientes (3)    ← badge vermelho/laranja com contagem de pendentes
```

**Se complexo** (requer chamada API extra no menu), pular — o banner na página de clientes é suficiente.

## TAREFA 6 — Validação

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
- Listagem mostra chips de status coloridos
- Filtro por status funciona
- Botões Aprovar/Rejeitar aparecem apenas para pendentes
- Dialog de confirmação funciona
- Aprovação chama API e atualiza lista
- Rejeição chama API com motivo e atualiza lista
- Toast de feedback aparece

## CRITÉRIOS DE SUCESSO

- [ ] Chips de status coloridos na tabela de clientes
- [ ] Filtro por status funcionando (tabs ou dropdown)
- [ ] Botão Aprovar com dialog de confirmação + API integrada
- [ ] Botão Rejeitar com campo motivo + dialog + API integrada
- [ ] Loading state durante chamadas
- [ ] Toast/feedback de sucesso/erro
- [ ] Refresh da listagem após ação
- [ ] Alerta visual de clientes pendentes (banner ou badge)
- [ ] Backend: 301 testes (inalterado)
- [ ] Frontend: build sem erros

## NOTAS IMPORTANTES

- **Não modificar backend.** Endpoints já existem (P49).
- **Verificar endpoints exatos** do backend: `PATCH /clientes/:id/aprovar` e `PATCH /clientes/:id/rejeitar`.
- **Verificar estrutura da resposta** da listagem de clientes — o campo `status` deve vir do backend. Se não vem, verificar o select/include no service.
- **Reutilizar padrões MUI** existentes (Dialog, Snackbar, Chip, etc.).
- **Emails são disparados pelo backend** — o frontend não precisa se preocupar com isso.
- **Commitar ao final** com: `feat(m3): tela admin aprovação/rejeição clientes pendentes`
