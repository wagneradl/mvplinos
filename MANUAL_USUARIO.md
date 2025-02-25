# Manual do Usuário - Sistema de Gestão de Pedidos da Lino's Panificadora

Este manual contém instruções detalhadas para o uso do Sistema de Gestão de Pedidos da Lino's Panificadora.

## 1. Acesso ao Sistema

O sistema está disponível em ambiente local através dos seguintes endereços:

- **Interface de usuário (frontend)**: http://localhost:3001
- **API (backend)**: http://localhost:3000

## 2. Funcionalidades Principais

### 2.1. Gerenciamento de Produtos

#### Cadastro de Produtos
1. Acesse o menu "Produtos" no painel lateral
2. Clique no botão "+ Novo Produto"
3. Preencha os campos obrigatórios:
   - Nome do produto
   - Preço unitário
   - Tipo de medida (kg, unidade, etc)
   - Status (ativo/inativo)
4. Clique em "Salvar"

#### Listagem e Filtragem de Produtos
1. Acesse o menu "Produtos"
2. Utilize o campo de busca para filtrar por nome
3. Utilize o seletor de status para filtrar produtos ativos/inativos
4. Clique nas colunas da tabela para ordenar

#### Edição de Produtos
1. Na listagem de produtos, clique no ícone de edição (lápis)
2. Atualize os campos desejados
3. Clique em "Salvar"

#### Exclusão/Inativação de Produtos
1. Na listagem de produtos, clique no ícone de exclusão (lixeira)
2. Confirme a operação
   
**Observação**: Produtos utilizados em pedidos não podem ser excluídos, apenas inativados.

### 2.2. Gerenciamento de Clientes

#### Cadastro de Clientes
1. Acesse o menu "Clientes" no painel lateral
2. Clique no botão "+ Novo Cliente"
3. Preencha os campos obrigatórios:
   - CNPJ
   - Razão Social
   - Nome Fantasia
   - Telefone
   - Email
   - Status (ativo/inativo)
4. Clique em "Salvar"

#### Listagem e Filtragem de Clientes
1. Acesse o menu "Clientes"
2. Utilize o campo de busca para filtrar por nome ou CNPJ
3. Utilize o seletor de status para filtrar clientes ativos/inativos

#### Edição de Clientes
1. Na listagem de clientes, clique no ícone de edição (lápis)
2. Atualize os campos desejados
3. Clique em "Salvar"

### 2.3. Gerenciamento de Pedidos

#### Criação de Pedidos
1. Acesse o menu "Pedidos" no painel lateral
2. Clique no botão "+ Novo Pedido"
3. Selecione o cliente (obrigatório)
4. Adicione produtos ao pedido:
   - Selecione o produto
   - Informe a quantidade
   - Clique em "Adicionar"
5. O sistema calculará automaticamente os valores
6. Clique em "Finalizar Pedido"

#### Listagem e Filtragem de Pedidos
1. Acesse o menu "Pedidos"
2. Utilize os filtros disponíveis:
   - Data inicial/final
   - Cliente
   - Status (ATIVO, CANCELADO)
3. Ajuste a paginação conforme necessário

#### Visualização de Detalhes do Pedido
1. Na listagem de pedidos, clique no ícone de visualização (olho)
2. Visualize os detalhes completos do pedido
3. Clique em "Ver PDF" para visualizar o documento gerado

#### Repetição de Pedidos
1. Na listagem de pedidos, clique no ícone de repetição (setas circulares)
2. Um novo pedido será criado com os mesmos itens
3. Você pode editar os itens antes de finalizar

#### Cancelamento de Pedidos
1. Na listagem de pedidos, clique no ícone de cancelamento (X)
2. Confirme a operação

**Observação**: Pedidos cancelados permanecem visíveis na lista, com status "CANCELADO".

### 2.4. Relatórios

#### Geração de Relatórios
1. Acesse o menu "Relatórios" no painel lateral
2. Selecione o período desejado (data inicial/final)
3. Opcionalmente, filtre por cliente específico
4. Clique em "Gerar Relatório"
5. Visualize as informações na tela:
   - Resumo por dia
   - Total de pedidos no período
   - Valor total
   - Ticket médio
6. Clique em "Exportar PDF" para salvar o relatório

## 3. Dicas e Boas Práticas

### 3.1. Organização de Pedidos
- Mantenha a lista de pedidos organizada utilizando os filtros disponíveis
- Utilize a funcionalidade de repetição de pedidos para clientes frequentes
- Verifique sempre o status dos pedidos

### 3.2. Gerenciamento de Produtos
- Mantenha a lista de produtos atualizada
- Inative produtos que não são mais comercializados em vez de excluí-los
- Verifique sempre o tipo de medida e o preço unitário

### 3.3. Backup e Segurança
- Solicite backups periódicos do banco de dados ao administrador do sistema
- Não compartilhe o acesso ao sistema com pessoas não autorizadas

## 4. Solução de Problemas Comuns

### 4.1. PDF não é gerado
- Verifique se o cliente e os produtos estão corretamente cadastrados
- Tente atualizar a página e repetir a operação

### 4.2. Filtros não funcionam como esperado
- Verifique se as datas estão no formato correto (DD/MM/AAAA)
- Limpe todos os filtros e aplique novamente

### 4.3. Erro ao criar pedido
- Verifique se todos os produtos estão ativos
- Verifique se o cliente está ativo
- Certifique-se de que o pedido tem pelo menos um item

## 5. Contato para Suporte

Em caso de dúvidas ou problemas, entre em contato com o suporte técnico:
- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX
