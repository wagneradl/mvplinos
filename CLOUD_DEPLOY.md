# Deploy em Nuvem - Lino's Panificadora

## Status do Deploy

- **Preparação do Código**: ✅ Concluída
- **Configuração na Render**: ⏳ Pendente
- **Deploy e Testes**: ⏳ Pendente
- **Migração de Dados**: ⏳ Pendente
- **Monitoramento e Backup**: ⏳ Pendente

## Alterações Realizadas

### Fase 1: Preparação do Código

- ✅ Schema Prisma atualizado para usar variáveis de ambiente
- ✅ Arquivo `.env.example` criado com configurações para nuvem
- ✅ Configuração para persistência de dados ajustada no serviço PDF
- ✅ Health checks adicionados para backend e frontend
- ✅ Script de backup para ambiente cloud implementado
- ✅ Arquivo `render.yaml` criado para configuração automatizada
- ✅ Ajustes no main.ts do backend para melhor suporte a ambiente de nuvem
- ✅ Adicionados scripts específicos no package.json do backend
- ✅ Script de configuração de arquivos estáticos adicionado
- ✅ Script de setup completo implementado
- ✅ Guia detalhado de deploy criado (DEPLOY_GUIDE.md)

### Fase 2: Configuração da Render

- ⏳ Criar conta no Render
- ⏳ Configurar o projeto como monorepo
- ⏳ Conectar ao repositório Git
- ⏳ Configurar variáveis de ambiente
- ⏳ Configurar volume persistente

### Fase 3: Deploy e Testes

- ⏳ Realizar primeiro deploy
- ⏳ Verificar logs e resolver possíveis erros
- ⏳ Testar todas as funcionalidades do sistema
- ⏳ Verificar geração de PDFs
- ⏳ Testar persistência de dados

### Fase 4: Migração de Dados

- ⏳ Exportar dados do sistema atual
- ⏳ Importar dados para o ambiente na nuvem
- ⏳ Verificar integridade dos dados migrados
- ⏳ Configurar domínio personalizado (opcional)

### Fase 5: Monitoramento e Backup

- ⏳ Configurar alertas de uptime
- ⏳ Configurar backup automático
- ⏳ Testar procedimento de restauração
- ⏳ Documentar configuração final

## Scripts de Administração em Nuvem

Para facilitar a administração do sistema já em produção, foram criados os seguintes scripts:

### Backup e Recuperação de Dados
- `yarn cloud:backup` - Realiza backup do banco de dados para /var/data/backups
- `yarn cloud:setup` - Executa a configuração básica do Prisma (generate + migrate)

### Configuração do Ambiente
- `yarn cloud:init` - Inicializa o ambiente completo com dados de exemplo
- `yarn cloud:setup-static` - Configura arquivos estáticos (logo, etc.)
- `yarn cloud:full-setup` - Executa uma configuração completa do ambiente

## URLs do Projeto

- Frontend: _pendente_
- Backend: _pendente_
- API Docs: _pendente_

## Instruções para Conclusão do Deploy

Para concluir o deploy, siga o guia detalhado disponível em `DEPLOY_GUIDE.md`, que contém:

1. Instruções passo-a-passo para configuração do Render
2. Guia para solução de problemas comuns
3. Procedimento alternativo para migração para Vercel (se necessário)
4. Testes e verificações recomendadas após o deploy

## Próximos Passos

1. Criar conta no Render
2. Seguir para a Fase 2: Configuração na Render usando o guia de deploy
3. Realizar o deploy e testar o sistema
4. Migrar os dados da implementação atual
5. Configurar monitoramento e backups automáticos
