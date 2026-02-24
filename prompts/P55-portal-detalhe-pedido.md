# P55 — Portal: Detalhe do Pedido (Timeline, Itens, PDF)

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. P54 concluído (listagem + criação pedidos portal, 301 testes).

**Objetivo:** Página de detalhe do pedido no portal do cliente — mostra informações completas, timeline de status (reutilizar StatusTimeline P48), itens do pedido, e botão para download de PDF.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 301 testes passando e working tree limpa.

## TAREFA 1 — Página /portal/pedidos/[id]

Criar `packages/frontend/src/app/(portal)/portal/pedidos/[id]/page.tsx`:

### Layout Geral
```
┌─────────────────────────────────────────────────────┐
│  ← Voltar para Meus Pedidos                        │
│                                                     │
│  Pedido #42                    [StatusChip: Pendente]│
│  Criado em 20/02/2026 às 14:30                      │
│                                                     │
│  ═══════════════════════════════════════════════════ │
│  StatusTimeline                                     │
│  [✓ Rascunho] → [● Pendente] → [ Confirmado] → ... │
│  ═══════════════════════════════════════════════════ │
│                                                     │
│  ┌─ Itens do Pedido ─────────────────────────────┐  │
│  │ Produto      │ Qtd │ Preço Unit. │ Subtotal   │  │
│  │ Pão Francês  │ 100 │ R$ 0,50    │ R$ 50,00   │  │
│  │ Bolo Choc.   │ 2   │ R$ 35,00   │ R$ 70,00   │  │
│  │──────────────┼─────┼────────────┼────────────│  │
│  │                      Total:     │ R$ 120,00  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Observações:                                       │
│  "Entregar pela manhã, antes das 8h"                │
│                                                     │
│  ┌─ Ações ───────────────────────────────────────┐  │
│  │ [📄 Baixar PDF]  [❌ Cancelar Pedido]          │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Seções

**Header:**
- Botão voltar (← Meus Pedidos) → `/portal/pedidos`
- Número do pedido + StatusChip (reutilizar P48)
- Data de criação formatada (dd/MM/yyyy HH:mm)

**Timeline:**
- Reutilizar `StatusTimeline` do P48
- Mostra progressão visual do pedido

**Itens do Pedido:**
- Tabela com: Produto (nome), Quantidade, Preço Unitário (R$), Subtotal
- Linha de total no rodapé
- Se houver muitos itens, scroll interno ou expandir

**Observações:**
- Texto do campo observações (se houver)
- Se vazio, não mostrar seção

**Ações:**
- Botão "Baixar PDF" → chama endpoint de PDF do pedido (se existir)
- Botão "Cancelar Pedido" → apenas se status permite (RASCUNHO/PENDENTE para CLIENTE)
  - Dialog de confirmação
  - PATCH /pedidos/:id/status com CANCELADO
  - Reutilizar lógica do P54

## TAREFA 2 — Dados do Pedido

```typescript
// GET /pedidos/:id — TenantGuard garante ownership
const { data: pedido } = useQuery({
  queryKey: ['pedido', id],
  queryFn: () => pedidosService.buscarPorId(id),
});
```

**ATENÇÃO:** Verificar o que o endpoint `GET /pedidos/:id` retorna. Precisa incluir:
- Dados do pedido (id, status, data, observacoes, total)
- Itens do pedido com dados do produto (nome, preco_unitario, quantidade)

Se o endpoint não retorna itens/produtos, verificar o include/select no backend PedidosService.findOne(). Se necessário, **ajustar o backend** para incluir itens com produto no retorno — isso é uma mudança mínima no select/include do Prisma.

## TAREFA 3 — Download PDF

Verificar se existe endpoint de PDF no backend (ex: `GET /pedidos/:id/pdf`).

**Se existir:**
```typescript
const handleDownloadPDF = async () => {
  const response = await api.get(`/pedidos/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pedido-${id}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};
```

**Se não existir:** Mostrar botão desabilitado com tooltip "Em breve" ou omitir por ora. Não criar endpoint de PDF neste prompt.

## TAREFA 4 — Link da Listagem para Detalhe

Na listagem de pedidos (P54), o botão "Ver" ou clique na linha deve navegar para `/portal/pedidos/[id]`.

Verificar se o P54 já implementou esse link. Se não, adicionar:
- Coluna "Ações" com botão/ícone "Ver detalhes" → `router.push(/portal/pedidos/${pedido.id})`
- Ou clique na linha inteira

## TAREFA 5 — Tratamento de Erros

- **Pedido não encontrado** (404 ou ownership violation): Mostrar mensagem "Pedido não encontrado" com botão voltar
- **Loading:** Skeleton/spinner enquanto carrega
- **Erro genérico:** "Erro ao carregar pedido. Tente novamente." com botão retry

## TAREFA 6 — Validação

### Build frontend
```bash
yarn workspace frontend build
```

### Backend
```bash
yarn workspace backend test
```
Target: 301 testes (ou +1-2 se ajustou include no findOne)

### Verificação visual
- `/portal/pedidos/42` mostra detalhe completo
- Timeline renderiza corretamente
- Itens listados com preços e total
- Observações aparecem se existirem
- Botão cancelar visível apenas para status permitidos
- PDF download funciona (se endpoint existir)
- Pedido de outro cliente → erro 403/404
- Link da listagem navega corretamente

## CRITÉRIOS DE SUCESSO

- [ ] Página `/portal/pedidos/[id]` criada
- [ ] Header com número, StatusChip, data
- [ ] StatusTimeline reutilizada do P48
- [ ] Tabela de itens com produto, qtd, preço, subtotal, total
- [ ] Observações exibidas (se houver)
- [ ] Botão cancelar condicional com dialog
- [ ] Botão PDF (funcional ou placeholder)
- [ ] Link da listagem para detalhe funcionando
- [ ] Loading/error states tratados
- [ ] Ownership enforcement (TenantGuard)
- [ ] Backend: 301+ testes
- [ ] Frontend: build sem erros

## NOTAS IMPORTANTES

- **Se o backend `findOne` não inclui itens/produto**, ajustar o include no PedidosService — é mudança mínima (1-2 linhas).
- **Reutilizar componentes**: StatusChip (P48), StatusTimeline (P48), lógica de cancelamento (P54).
- **Não criar novas funcionalidades de pedido** — apenas visualização + cancelamento.
- **O admin já tem detalhe do pedido** em `(admin)/pedidos/[id]/`. O portal tem visão mais simples (sem botões de transição interna como Confirmar/Produção/etc.).
- **Commitar ao final** com: `feat(m3): portal detalhe pedido — timeline, itens, PDF, cancelamento`
