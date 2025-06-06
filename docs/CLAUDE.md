# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lino's Panificadora is a bakery management system designed to handle:
- Product management (bakery items)
- Customer management (B2B clients)
- Order processing and tracking
- PDF generation for orders
- Sales reports

The system is structured as a monorepo using Yarn Workspaces with a NestJS backend and Next.js frontend.

## Repository Structure

```
Lino's Panificadora/
├── packages/
│   ├── backend/             # NestJS backend
│   ├── frontend/            # Next.js frontend
│   ├── shared/              # Shared types and utilities
│   └── server/              # Server-specific code
├── scripts/                 # Utility scripts
├── prisma/                  # Database schema and migrations
├── docs/                    # Documentation
```

## Commands

### Development

```bash
# Install dependencies
yarn install

# Start development environment (runs both frontend and backend)
yarn dev

# Build all packages
yarn build

# Start production mode
yarn start

# Start backend only in production mode
yarn start:prod
```

### Testing and Linting

```bash
# Run all tests
yarn test

# Run backend tests
yarn workspace @linos/backend test

# Run specific backend test file
yarn workspace @linos/backend test <path-to-test-file>

# Run frontend tests
yarn workspace @linos/frontend test

# Run linting
yarn lint

# Format code
yarn format
```

### Database Operations

```bash
# Generate Prisma client
cd packages/backend && npx prisma generate

# Apply migrations
cd packages/backend && npx prisma migrate deploy

# Seed the database
cd packages/backend && yarn seed

# Reset database (caution: deletes all data)
cd packages/backend && npx prisma migrate reset

# Create a backup
yarn backup

# Verify backup integrity
yarn backup:verify

# Restore a backup
yarn backup:restore
```

### Deployment

```bash
# Deploy to production
yarn deploy

# Clean and deploy (remove dist folders first)
yarn deploy:clean

# Verify deployment
yarn deploy:verify
```

## Technology Stack

### Backend (NestJS)
- TypeScript
- Prisma ORM with SQLite
- JWT Authentication
- Puppeteer for PDF generation
- Class Validator for DTO validation

### Frontend (Next.js)
- TypeScript
- Material UI (MUI)
- React Query for data fetching
- React Hook Form with Zod for form validation

## Database Schema

The main entities in the system are:
- `Usuario`: System users with roles and permissions
- `Papel`: User roles with permission settings
- `Cliente`: B2B customers with business details
- `Produto`: Products with pricing and measurement types
- `Pedido`: Orders with status tracking and total values
- `ItemPedido`: Line items in each order

## Architecture Notes

1. The system uses a monorepo structure with Yarn Workspaces
2. The backend provides a RESTful API consumed by the frontend
3. PDF generation happens on the backend using Puppeteer
4. Database backups are stored in the `backups/` directory
5. The system is currently deployed and operational on Render.com using the `render.yaml` configuration

## ⚠️ IMPORTANTE: Sistema em Produção

Este sistema está atualmente **em produção** no Render.com com dados reais do estabelecimento:

1. O sistema foi inicialmente desenvolvido para Windows, adaptado para WSL2, e posteriormente migrado para a nuvem (Render.com)
2. **Qualquer push para o branch principal causará implantação automática** na versão de produção
3. O banco de dados de produção contém informações sensíveis e operacionais do negócio
4. Todas as alterações devem ser testadas localmente antes de serem enviadas para produção
5. **NUNCA** execute comandos que possam resetar ou modificar o banco de dados de produção sem antes fazer backup
6. Use branches de desenvolvimento para testar novas funcionalidades

## Windows Compatibility

The system was designed for Unix-like environments (macOS/Linux). For Windows compatibility, the system uses WSL2 (Windows Subsystem for Linux) to avoid known issues with Prisma in Windows environments, particularly path resolution problems in monorepos.

## Important Files to Know

- `/packages/backend/src/main.ts`: Main backend entry point
- `/packages/backend/src/app.module.ts`: Main backend module
- `/packages/frontend/src/pages/_app.tsx`: Main frontend entry point
- `/packages/backend/prisma/schema.prisma`: Database schema
- `/scripts/backup/*.js`: Database backup and restore utilities
- `/render.yaml`: Deployment configuration for Render.com

## Common Issues and Solutions

### Prisma Issues on Windows
- Use WSL2 for development on Windows
- Or ensure correct path resolution in Prisma commands

### PDF Generation
- Requires Puppeteer dependencies to be installed
- Check PDF storage path configuration
- Ensure proper permissions on the uploads directory

### Database Operations

**Ambiente de Desenvolvimento:**
- Use o script `reset-database.sh` apenas em desenvolvimento
- Utilize os endpoints de admin para manutenção do banco (`/admin/seed`, `/admin/reset-database`, `/admin/clean-test-data`)

**Ambiente de Produção:**
- **NUNCA** execute `npx prisma migrate reset` ou qualquer comando destrutivo em produção
- **SEMPRE** faça backup antes de executar migrações ou modificações no banco
- Use os scripts de backup em `scripts/backup/` para garantir a preservação dos dados
- Qualquer alteração no esquema do banco deve ser feita através de migrações controladas
- Teste exaustivamente migrações localmente antes de aplicá-las em produção

### Fluxo de Trabalho Seguro para Produção
1. Crie um branch de desenvolvimento para novas funcionalidades
2. Teste localmente todas as alterações
3. Crie um backup do banco de produção antes do deploy
4. Faça o merge/push apenas quando tiver certeza de que as alterações são seguras
5. Monitore os logs após o deploy para verificar se tudo está funcionando corretamente