# Guia de Deploy no Render - Lino's Panificadora

Este guia fornece os passos detalhados para configurar e realizar o deploy do sistema Lino's Panificadora na plataforma Render.

## Pré-requisitos

1. Conta no GitHub (já configurada)
2. Código preparado para deploy (já realizado na Fase 1)
3. Acesso à internet

## Fase 2: Configuração do Render

### 1. Criar conta e acessar o Render

1. Acesse [render.com](https://render.com/)
2. Clique em "Get Started" ou "Sign Up"
3. Recomendo se registrar usando sua conta GitHub, para facilitar a integração
4. Complete o processo de registro e verifique seu email se necessário

### 2. Conectar ao GitHub e ao repositório

1. No dashboard do Render, clique em "New +"
2. Selecione "Blueprint" (para usar nosso render.yaml)
3. Clique em "Connect GitHub" (caso ainda não tenha feito)
4. Autorize o acesso ao repositório `wagneradl/mvplinos`
5. Selecione o repositório na lista

### 3. Configurar o Blueprint

1. O Render detectará automaticamente o arquivo `render.yaml` no repositório
2. Revise as configurações exibidas:
   - Dois serviços web: backend e frontend
   - Volume persistente para dados
   - Variáveis de ambiente

3. Se tudo estiver correto, clique em "Apply Blueprint"

### 4. Verificar e ajustar configurações (se necessário)

#### Backend:
- Nome: linos-backend
- Região: Oregon (ou escolha a mais próxima)
- Branch: main
- Build Command: `yarn workspace @linos/backend install && yarn workspace @linos/backend prisma generate && yarn workspace @linos/backend build`
- Start Command: `cd packages/backend && yarn cloud:full-setup && yarn start:prod`
- Plano: Starter ($7/mês)

#### Frontend:
- Nome: linos-frontend
- Região: Oregon (ou a mesma do backend)
- Branch: main
- Build Command: `yarn workspace @linos/frontend install && yarn workspace @linos/frontend build`
- Start Command: `cd packages/frontend && yarn start`
- Plano: Starter ($7/mês)

#### Volume Persistente:
- Certifique-se que o volume esteja configurado para o backend
- Tamanho: 1GB
- Ponto de montagem: /var/data

### 5. Configurar variáveis de ambiente seguras

Se você preferir não usar o grupo de variáveis no render.yaml:

1. No serviço backend, vá para "Environment" na barra lateral
2. Adicione a variável `JWT_SECRET` com um valor seguro (pode usar um gerador online de tokens)
3. Clique em "Save Changes"

### 6. Iniciar o deploy

1. Após revisar todas as configurações, clique em "Create New Resources"
2. O Render começará o processo de build e deploy de ambos os serviços
3. Aguarde a conclusão (pode levar alguns minutos)

## Fase 3: Deploy e Testes

### 1. Monitorar o processo de build

1. Acesse cada serviço e vá para a aba "Logs"
2. Acompanhe o processo de build e deployment
3. Verifique se há erros e corrija-os conforme necessário

### 2. Testar os endpoints de saúde (health)

1. Backend: Acesse `https://linos-backend.onrender.com/health`
2. Frontend: Acesse `https://linos-frontend.onrender.com/api/health`
3. Ambos devem retornar status 200 com informações básicas

### 3. Inicializar o banco de dados (se necessário)

Se o banco estiver vazio após o deploy (o script de inicialização automática falhar):

1. Vá para o serviço backend no Render
2. Acesse a seção "Shell"
3. Execute: `yarn cloud:init`
4. Isso irá gerar as tabelas e dados iniciais

### 4. Testar funcionalidades

Acesse o frontend e teste todas as funcionalidades:
1. Cadastro de produtos
2. Cadastro de clientes
3. Criação de pedidos
4. Geração de PDFs
5. Geração de relatórios

## Fase 4: Migração de Dados

### 1. Exportar dados do sistema atual

1. No sistema atual, realize um backup do banco SQLite
2. O arquivo deve estar em `prisma/dev.db` ou conforme configurado

### 2. Importar dados para o ambiente na nuvem

1. Vá para o serviço backend no Render
2. Acesse a seção "Shell"
3. Use o utilitário `curl` ou similar para baixar o arquivo de backup para o servidor
   ```
   curl -o /var/data/import.db https://URL-DO-SEU-BACKUP
   ```
4. Substitua o banco existente (certifique-se de fazer backup antes):
   ```
   cp /var/data/import.db /var/data/linos-panificadora.db
   ```

### 3. Verificar integridade

Acesse o frontend e verifique se todos os dados foram migrados corretamente.

## Fase 5: Monitoramento e Backup

### 1. Configurar backup automático

1. No serviço backend no Render
2. Vá para "Cron Jobs"
3. Adicione um novo job:
   - Nome: Daily Database Backup
   - Comando: `yarn cloud:backup`
   - Agenda: `0 0 * * *` (diariamente à meia-noite)

### 2. Configurar alertas de uptime (opcional)

Para monitoramento mais avançado, considere usar serviços como UptimeRobot ou Freshping, apontando para os endpoints de health.

### 3. Documentação final

Atualize o arquivo CLOUD_DEPLOY.md com as URLs finais e informações relevantes.

## Scripts Disponíveis

Para facilitar a administração do sistema na nuvem, fornecemos os seguintes scripts:

- `yarn cloud:backup` - Realiza backup do banco de dados SQLite
- `yarn cloud:setup` - Configura o ambiente Prisma
- `yarn cloud:init` - Inicializa o banco de dados com dados de exemplo
- `yarn cloud:setup-static` - Configura arquivos estáticos (logo, etc.)
- `yarn cloud:full-setup` - Executa uma configuração completa do ambiente

## URLs e Acesso

Uma vez concluído o deploy, você terá acesso aos seguintes URLs:

- Frontend: `https://linos-frontend.onrender.com`
- Backend: `https://linos-backend.onrender.com`
- API Docs: `https://linos-backend.onrender.com/api`

## Solução de Problemas Comuns

### Backend não consegue conectar ao banco de dados

Verifique:
- Se o volume está corretamente montado
- Se o caminho no DATABASE_URL está correto
- Se as permissões estão adequadas

### Erro de CORS no frontend

Verifique:
- Se a URL do backend está corretamente configurada no frontend
- Se os headers CORS estão habilitados no backend

### PDFs não são gerados

Verifique:
- Se o diretório em PDF_STORAGE_PATH existe e tem permissões de escrita
- Se o Puppeteer está sendo inicializado corretamente
- Logs de erro específicos

### Erro de memória durante o build

- Tente ajustar os recursos do plano no Render
- Simplifique o processo de build, removendo passos desnecessários

### Problemas com os arquivos estáticos

- Verifique se o diretório `/var/data/static` existe
- Execute manualmente `yarn cloud:setup-static` para copiar os arquivos estáticos

## Migração para Vercel (Alternativa)

Se encontrar dificuldades persistentes com o Render, pode migrar para o Vercel seguindo estes passos:

1. Crie uma conta no [vercel.com](https://vercel.com/)
2. Importe o repositório do GitHub
3. Configure como dois projetos separados:
   - Frontend: Configure diretório como `packages/frontend`
   - Backend: Configure diretório como `packages/backend`

4. Para o backend, você precisará:
   - Usar um banco de dados externo como PlanetScale ou Supabase
   - Atualizar o schema.prisma para usar mysql ou postgresql
   - Configurar os scripts de build e inicialização

A migração para Vercel será documentada em detalhes se for necessária.

---

Se encontrar outros problemas durante o deploy, consulte a [documentação oficial do Render](https://render.com/docs) ou entre em contato para assistência adicional.
