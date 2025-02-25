# Documentação Técnica para Administradores do Sistema - Lino's Panificadora

Este documento fornece informações técnicas detalhadas sobre o Sistema de Gestão de Pedidos da Lino's Panificadora, destinado a administradores de sistema e desenvolvedores.

## Arquitetura do Sistema

O sistema foi desenvolvido como um monorepo usando Yarn Workspaces, com a seguinte estrutura:

```
Lino's Panificadora/
├── packages/
│   ├── backend/             # Backend NestJS
│   ├── frontend/            # Frontend Next.js
│   ├── shared/              # Tipos e utilitários compartilhados
│   └── server/              # Código específico de servidor
├── scripts/
│   ├── backup/              # Scripts de backup
│   ├── deploy/              # Scripts de deploy
│   └── wsl/                 # Scripts para compatibilidade WSL
├── backups/                 # Diretório de backups
├── logs/                    # Logs do sistema
└── docs/                    # Documentação
```

### Stack Tecnológico

#### Backend
- **Framework**: NestJS 10.x
- **Banco de Dados**: SQLite 3
- **ORM**: Prisma 5.x
- **Geração de PDFs**: Puppeteer 19+
- **API**: RESTful com validação via class-validator

#### Frontend
- **Framework**: Next.js 13
- **UI**: Material-UI (MUI) 5.x
- **Gerenciamento de Estado**: React Query
- **Formulários**: React Hook Form com Zod
- **Formatação**: ESLint e Prettier

## Ambiente Windows vs. Unix

O sistema foi originalmente desenvolvido e testado em ambientes Unix-like (macOS/Linux). Para garantir compatibilidade com Windows, a solução recomendada é usar o WSL2 (Windows Subsystem for Linux).

### Problema Conhecido com Prisma no Windows

Quando instalado diretamente no Windows, o Prisma apresenta um problema específico relacionado à resolução de módulos em monorepos. O erro típico é:

```
Cannot find module '...\node_modules\node_modules\prisma\build\index.js'
```

Este problema ocorre porque o Prisma tenta acessar seus módulos em um caminho duplicado com `node_modules\node_modules\prisma` em vez de `node_modules\prisma`.

### Solução WSL2

A solução WSL2 contorna completamente este problema, permitindo que o sistema funcione em ambiente Windows sem modificações no código. A seção de scripts WSL fornece todas as ferramentas necessárias para instalação, configuração e manutenção do sistema.

## Banco de Dados

### Estrutura

O sistema utiliza SQLite com Prisma ORM. O esquema do banco de dados inclui:

- **Produto**: Informações de produtos com preços e status
- **Cliente**: Cadastro de clientes B2B
- **Pedido**: Registro de pedidos com status e valores totais
- **ItensPedido**: Itens individuais de cada pedido

### Migrations e Seed

Para inicializar o banco de dados:

```bash
cd packages/backend
npx prisma migrate deploy
```

Para resetar o banco com dados de teste (não use em produção):

```bash
npx prisma migrate reset
```

### Backup e Recuperação

Os scripts na pasta `scripts/wsl` fornecem funcionalidades completas de backup e recuperação:

- **backup-system.sh**: Cria backups manuais
- **restore-system.sh**: Restaura backups
- **setup-auto-backup.sh**: Configura backups automáticos via cron

Os backups são armazenados na pasta `backups/` e incluem:
- Backups manuais: `backup_AAAAMMDD_HHMMSS.db`
- Backups automáticos: `auto_backup_AAAAMMDD_HHMMSS.db`

## Geração de PDFs

O sistema utiliza Puppeteer para gerar PDFs de pedidos. O serviço de PDF está implementado em:

```
packages/backend/src/pdf/pdf.service.ts
```

Pontos importantes:
- Puppeteer requer a instalação de dependências específicas no sistema operacional
- No WSL, essas dependências são instaladas automaticamente pelo script `install-wsl.sh`
- Os PDFs gerados são armazenados em `packages/backend/uploads/pdfs/`
- O logo usado nos PDFs está em `packages/backend/uploads/static/logo.png`

## Logs e Monitoramento

Os logs do sistema são armazenados em:

- Backend: `logs/backend.log`
- Frontend: `logs/frontend.log`
- Backups automáticos: `logs/auto_backup_AAAAMMDD.log`

Para gerar um relatório completo do estado do sistema:

```bash
./scripts/wsl/status-report.sh
```

Este relatório é útil para diagnóstico e suporte remoto.

## Segurança

### Considerações Atuais

O sistema atual foi projetado para uso local e offline. Considerações de segurança para evolução futura:

1. **Autenticação**: Implementar autenticação JWT com níveis de acesso
2. **Validação**: Implementar validação aprimorada de CNPJ via API externa
3. **Proteção de Dados**: Implementar backup automático na nuvem com criptografia
4. **Logs de Auditoria**: Implementar registro detalhado de ações críticas

### Atualizações de Segurança

Para manter o sistema seguro, é recomendado:

1. Manter as dependências atualizadas regularmente
2. Monitorar os logs do sistema para atividades suspeitas
3. Implementar backups offsite para dados críticos

## Operações Rotineiras

### Iniciar/Parar o Sistema

```bash
# Iniciar
./start-system.sh

# Parar
./stop-system.sh
```

### Backup Manual

```bash
./backup-system.sh
```

### Verificar Status

```bash
./scripts/wsl/status-report.sh
```

### Manutenção do Banco de Dados

Para otimizar o banco de dados SQLite:

```bash
cd packages/backend
sqlite3 prisma/dev.db "VACUUM;"
```

## Solução de Problemas

### Verificação de Sistema

```bash
./scripts/wsl/test-wsl-env.sh
```

Este script verifica todos os componentes necessários e identifica possíveis problemas.

### Problemas Comuns e Soluções

#### Backend não inicia

Verifique:
1. Log em `logs/backend.log`
2. Permissões do banco de dados (`chmod 644 packages/backend/prisma/dev.db`)
3. Pasta de uploads (`mkdir -p packages/backend/uploads/{pdfs,static}`)

#### Frontend não inicia

Verifique:
1. Log em `logs/frontend.log`
2. Se o backend está rodando (necessário para o frontend funcionar)
3. Se a porta 3000 está disponível (`lsof -i :3000`)

#### Erro de Banco de Dados

```bash
cd packages/backend
npx prisma migrate reset
```

**ATENÇÃO**: Este comando apaga todos os dados!

## Próximas Melhorias Planejadas

### Prioridade Alta
- Autenticação e autorização com diferentes níveis de acesso
- Backup automático na nuvem
- Dashboard visual para indicadores de vendas

### Prioridade Média
- Integração com APIs externas para validação de CNPJ
- Sistema de notificações em tempo real
- Migração para banco de dados mais robusto (MySQL/PostgreSQL)

### Prioridade Baixa
- Aplicativo móvel para consulta de pedidos
- Integração com sistemas de ERP
- Sistema de etiquetas e códigos de barras

## Contato e Suporte

Para suporte técnico, execute o relatório de status e envie para:
- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX

---

Documento criado em: 25/02/2025  
Última atualização: 25/02/2025  
Versão do sistema: 1.0.0
