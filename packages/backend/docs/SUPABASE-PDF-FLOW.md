# Fluxo de Geração e Armazenamento de PDFs com Supabase

Este documento explica como o sistema gera PDFs de pedidos e os armazena no Supabase Storage, permitindo acesso direto via URLs públicas.

## Arquitetura e Fluxo de Dados

O processo de geração e armazenamento de PDFs segue o seguinte fluxo:

```
[Pedido Criado] → [PedidosService] → [PdfService] → [SupabaseService] → [Supabase Storage]
                                                  ↓
                                  [URL pública armazenada no banco]
```

### 1. Ponto de Entrada

O fluxo começa no `PedidosService`, que é chamado quando:

- Um novo pedido é criado (`create` method)
- Um pedido existente é atualizado (`update` method)
- O endpoint `/pedidos/:id/pdf` é chamado para download do PDF

### 2. Geração do PDF

O `PdfService` é responsável por gerar o PDF em memória:

- Utiliza Puppeteer para renderizar HTML em PDF
- O HTML do pedido é montado dinamicamente usando os dados do pedido
- Suporta inclusão de logo e formatação específica
- Retorna o PDF como Buffer quando integrando com Supabase

### 3. Upload para Supabase

O `SupabaseService` gerencia o upload do arquivo para o Supabase Storage:

- Recebe o Buffer do PDF e informações de metadados
- Faz upload para o bucket configurado em `SUPABASE_BUCKET` (padrão: "pedidos-pdfs")
- Gera e retorna uma URL pública para acesso direto ao arquivo
- Tratamento de erros em caso de falha no upload

### 4. Armazenamento no Banco

O `PedidosService` armazena:

- `pdf_url`: URL pública do Supabase para acesso direto ao PDF
- `pdf_path`: Caminho local do arquivo (fallback) caso o Supabase não esteja disponível

## Detalhes da Implementação

### Convenção de Nomeação de Arquivos

Os PDFs são nomeados seguindo o padrão:

```
pedido-{id}-{timestamp}.pdf
```

Onde:
- `id` é o ID do pedido
- `timestamp` é a data atual em milissegundos, para evitar cache e conflitos

### Fallback para Armazenamento Local

O sistema possui um fallback inteligente:

- Verifica se o Supabase está configurado usando `SupabaseService.isAvailable()`
- Caso o Supabase não esteja disponível, salva o PDF localmente em `uploads/pdfs/`
- O fallback também é usado caso o upload para o Supabase falhe

### Acesso ao PDF

O endpoint `GET /pedidos/:id/pdf` automaticamente:

1. Verifica se existe uma URL do Supabase (campo `pdf_url`)
2. Se existir, redireciona o cliente diretamente para a URL pública
3. Se não existir, busca o arquivo no armazenamento local (campo `pdf_path`)
4. Retorna erro 404 se nenhuma opção estiver disponível

## Configuração

As seguintes variáveis de ambiente são necessárias:

```
SUPABASE_URL=https://vuxmjtpfbcpvncmabnhe.supabase.co
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=pedidos-pdfs
```

## Tratamento de Erros

O sistema implementa tratamento robusto de erros:

- Verifica se as variáveis de ambiente estão configuradas
- Valida se o cliente Supabase foi inicializado corretamente
- Trata falhas durante o upload para o Supabase
- Fornece mensagens de erro detalhadas para debugging
- Registra logs detalhados em cada etapa do processo

## Testes

Para testar o fluxo completo:

1. Criar um novo pedido via API
2. Acessar o endpoint `GET /pedidos/:id/pdf` para download do PDF
3. Verificar se a URL do PDF está correta no banco de dados
4. Validar se o arquivo está acessível diretamente via URL do Supabase

## Diagrama de Sequência

```
┌─────────┐          ┌──────────────┐          ┌───────────┐          ┌──────────────┐          ┌─────────────────┐
│ Cliente  │          │PedidosService│          │ PdfService│          │SupabaseService│          │ Supabase Storage│
└────┬────┘          └───────┬──────┘          └─────┬─────┘          └───────┬──────┘          └────────┬────────┘
     │                       │                        │                        │                          │
     │ POST /pedidos         │                        │                        │                          │
     │─────────────────────>│                        │                        │                          │
     │                       │                        │                        │                          │
     │                       │ generatePedidoPdf()    │                        │                          │
     │                       │───────────────────────>│                        │                          │
     │                       │                        │                        │                          │
     │                       │                        │ gerar PDF              │                          │
     │                       │                        │<───────────────────────│                          │
     │                       │                        │                        │                          │
     │                       │                        │ uploadFile()           │                          │
     │                       │                        │───────────────────────>│                          │
     │                       │                        │                        │                          │
     │                       │                        │                        │ upload do arquivo        │
     │                       │                        │                        │────────────────────────>│
     │                       │                        │                        │                          │
     │                       │                        │                        │ URL pública              │
     │                       │                        │                        │<─────────────────────────│
     │                       │                        │                        │                          │
     │                       │                        │ URL pública            │                          │
     │                       │                        │<───────────────────────│                          │
     │                       │                        │                        │                          │
     │                       │ PdfResult              │                        │                          │
     │                       │<───────────────────────│                        │                          │
     │                       │                        │                        │                          │
     │                       │ Salvar URL no banco    │                        │                          │
     │                       │<───────────────────────│                        │                          │
     │                       │                        │                        │                          │
     │ 201 Created           │                        │                        │                          │
     │<─────────────────────│                        │                        │                          │
     │                       │                        │                        │                          │
     │ GET /pedidos/:id/pdf  │                        │                        │                          │
     │─────────────────────>│                        │                        │                          │
     │                       │                        │                        │                          │
     │                       │ getPdfInfo()           │                        │                          │
     │                       │───────────────────────>│                        │                          │
     │                       │                        │                        │                          │
     │                       │ PdfInfo                │                        │                          │
     │                       │<───────────────────────│                        │                          │
     │                       │                        │                        │                          │
     │ Redirect to URL       │                        │                        │                          │
     │<─────────────────────│                        │                        │                          │
     │                       │                        │                        │                          │
     │ GET PDF (direto)      │                        │                        │                          │
     │───────────────────────────────────────────────────────────────────────────────────────────────────>│
     │                       │                        │                        │                          │
     │ PDF Content           │                        │                        │                          │
     │<──────────────────────────────────────────────────────────────────────────────────────────────────│
     │                       │                        │                        │                          │
```
