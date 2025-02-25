# Guia de Implantação - Sistema de Gestão de Pedidos da Lino's Panificadora

Este documento fornece instruções detalhadas para a implantação e manutenção do Sistema de Gestão de Pedidos da Lino's Panificadora.

## 1. Requisitos do Sistema

- **Node.js**: versão 20.x LTS ou superior
- **Yarn**: versão 1.22 ou superior
- **Espaço em disco**: mínimo 1GB para aplicação e banco de dados
- **Sistema operacional**: Windows 10/11, macOS ou Linux (Ubuntu/Debian recomendado)
- **Permissões**: acesso para criar/modificar arquivos e diretórios

## 2. Processo de Implantação

### 2.1. Preparação do Ambiente

1. **Clonar o repositório**:
   ```bash
   git clone [URL_DO_REPOSITORIO] linos-sistema
   cd linos-sistema
   ```

2. **Executar o script de instalação**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
   Este script automatiza a instalação de dependências, configuração do banco de dados e preparação dos diretórios necessários.

### 2.2. Verificações Pós-Instalação

1. **Verificar a estrutura do banco de dados**:
   ```bash
   npx prisma migrate status
   ```

2. **Verificar a geração do cliente Prisma**:
   ```bash
   ls -la node_modules/.prisma/client
   ```

3. **Verificar os diretórios de upload**:
   ```bash
   ls -la uploads/pdfs uploads/static
   ```

4. **Iniciar o sistema em modo desenvolvimento**:
   ```bash
   yarn dev
   ```

## 3. Estrutura do Sistema

```
Linos/
├── packages/
│   ├── backend/     # API REST (NestJS)
│   └── frontend/    # Interface (Next.js)
├── prisma/          # Schema e migrações
├── uploads/         # Arquivos gerados (PDFs)
└── scripts/         # Scripts de utilidade
```

## 4. Operação e Manutenção

### 4.1. Iniciar o Sistema

**Em ambiente de desenvolvimento**:
```bash
yarn dev
```

**Em ambiente de produção**:
```bash
yarn build
yarn start
```

### 4.2. Backup do Banco de Dados

O banco de dados SQLite está localizado em `./prisma/dev.db`. Para fazer backup:

```bash
# Backup manual
cp ./prisma/dev.db ./backups/linos-backup-$(date +%Y%m%d).db

# Script de backup automatizado (pode ser agendado)
mkdir -p backups
cp ./prisma/dev.db ./backups/linos-backup-$(date +%Y%m%d).db
```

### 4.3. Manutenção do Banco de Dados

**Verificar tabelas**:
```bash
npx prisma studio
```

**Resetar banco (apenas em desenvolvimento)**:
```bash
npx prisma migrate reset
```

**Reiniciar/Reconstruir banco**:
```bash
npx prisma migrate deploy
```

## 5. Solução de Problemas

### 5.1. Problemas Comuns

#### PDFs não são gerados

- Verifique se a pasta `/uploads/pdfs` existe e tem permissões de escrita
- Verifique se o Puppeteer está instalado corretamente
- Verifique se o logo está presente em `/uploads/static/logo.png`

```bash
# Verificar permissões
ls -la uploads/pdfs
ls -la uploads/static

# Corrigir permissões se necessário
chmod -R 755 uploads
```

#### Erro de conexão com banco de dados

- Verifique se o arquivo do banco existe em `./prisma/dev.db`
- Verifique se as migrações foram aplicadas corretamente

```bash
# Verificar se o arquivo existe
ls -la ./prisma/dev.db

# Aplicar migrações novamente
npx prisma migrate deploy
```

#### Erros de TypeScript no build

- Verifique se o cliente Prisma está gerado corretamente

```bash
# Regenerar o cliente Prisma
npx prisma generate
```

### 5.2. Logs e Diagnóstico

- **Frontend**: Logs no console do navegador
- **Backend**: Logs no console do terminal onde o servidor está rodando

## 6. Contatos de Suporte

Para qualquer problema durante a implantação ou operação, entre em contato com:
- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX

## 7. Créditos e Licença

Sistema desenvolvido para a Lino's Panificadora.
Copyright © 2025 Lino's Panificadora. Todos os direitos reservados.
