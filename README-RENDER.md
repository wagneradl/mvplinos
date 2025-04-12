# Deploy do Sistema Lino's Panificadora no Render

Este guia fornece informações sobre o deploy do sistema Lino's Panificadora na plataforma Render.

## Arquivos de Configuração para o Render

O projeto inclui os seguintes arquivos específicos para o deploy no Render:

- **render.yaml**: Configuração principal para o Blueprint do Render
- **scripts/render-postinstall.js**: Script executado após a instalação para configurar o ambiente
- **scripts/cloud/full-setup.js**: Script para configuração completa do ambiente (Prisma, arquivos estáticos, etc.)
- **scripts/cloud/setup-static.js**: Script para configuração dos arquivos estáticos

## Estrutura do Projeto

O sistema está configurado como um monorepo com dois serviços principais:

1. **Backend (NestJS)**
   - API RESTful
   - Banco de dados SQLite
   - Geração de PDFs com Puppeteer

2. **Frontend (Next.js)**
   - Interface de usuário com Material UI
   - Comunicação com a API do backend

## Requisitos do Render

Para que o deploy funcione corretamente, certifique-se de que:

1. Sua conta no Render tem um método de pagamento configurado (para os planos Starter)
2. O repositório Git está acessível
3. O Blueprint do Render está habilitado

## Processo de Deploy

### Via Blueprint (Recomendado)

1. Acesse o dashboard do Render
2. Clique em "New" e selecione "Blueprint"
3. Conecte seu repositório Git
4. O Render detectará automaticamente o arquivo render.yaml
5. Revise as configurações e clique em "Apply Blueprint"

### Deploy Manual

Se preferir fazer o deploy manualmente:

1. Crie um novo Web Service para o backend
   - Build Command: `yarn install --ignore-scripts && node scripts/render-postinstall.js && cd packages/backend && npx prisma generate && yarn build`
   - Start Command: `cd packages/backend && node dist/main`

2. Crie um novo Web Service para o frontend
   - Build Command: `yarn install --ignore-scripts && cd packages/frontend && yarn build`
   - Start Command: `cd packages/frontend && yarn start`

## Variáveis de Ambiente

As seguintes variáveis de ambiente são necessárias:

### Backend
- `NODE_ENV`: `production`
- `PORT`: `10000`
- `DATABASE_URL`: `file:/var/data/linos-panificadora.db`
- `PDF_STORAGE_PATH`: `/var/data/pdfs`
- `UPLOADS_PATH`: `/var/data`
- `JWT_SECRET`: Gerado automaticamente pelo Render

### Frontend
- `NODE_ENV`: `production`
- `NEXT_PUBLIC_API_URL`: URL do serviço backend (`https://linos-backend.onrender.com`)

## Disco Persistente

O backend requer um disco persistente para armazenar:
- Banco de dados SQLite
- PDFs gerados
- Arquivos estáticos (logo, etc.)

## Solução de Problemas

### Erro "prisma: not found"
Este erro pode ocorrer durante o processo de build. As alterações feitas nos arquivos de configuração já corrigem esse problema, usando `npx prisma` e evitando o script postinstall automático.

### Arquivos Estáticos Ausentes
Se a logo ou outros arquivos estáticos não aparecerem, verifique se os diretórios em `/var/data` foram criados corretamente. Use o script `yarn cloud:setup-static` para copiar os arquivos manualmente.

### Erro de Conexão com o Banco de Dados
Verifique se o caminho do banco no `DATABASE_URL` está correto e se o volume persistente está configurado corretamente.

## Scripts Úteis

- `yarn cloud:backup`: Realiza backup do banco de dados
- `yarn cloud:setup`: Configura o ambiente Prisma
- `yarn cloud:init`: Inicializa o banco de dados com dados de exemplo
- `yarn cloud:setup-static`: Configura arquivos estáticos
- `yarn cloud:full-setup`: Executa uma configuração completa do ambiente

## Monitoramento

O sistema inclui endpoints de health check para monitoramento:
- Backend: `/health`
- Frontend: `/api/health`

---

Para informações mais detalhadas, consulte os arquivos [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) e [CLOUD_DEPLOY.md](./CLOUD_DEPLOY.md).
