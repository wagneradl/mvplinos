# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lino's Panificadora is a bakery management system (B2B) for managing products, customers, orders, and generating PDFs/reports. Monorepo using Yarn Workspaces with Turborepo.

## Commands

```bash
# Development
yarn dev                    # Run frontend + backend concurrently
yarn build                  # Build all packages
yarn start:prod             # Production backend (builds, checks DB, runs)

# Testing
yarn test                   # Run all tests
yarn workspace @linos/backend test              # Backend tests only
yarn workspace @linos/backend test path/to/file # Single test file
yarn workspace @linos/frontend test             # Frontend tests only

# Linting/Formatting
yarn lint
yarn format

# Database (from packages/backend/)
npx prisma generate         # Generate Prisma client
npx prisma migrate deploy   # Apply migrations
yarn seed                   # Seed database
npx prisma studio           # Open Prisma Studio GUI

# Backup
yarn backup                 # Create backup
yarn backup:verify          # Verify backup integrity
yarn backup:restore         # Restore from backup
```

## Architecture

### Monorepo Structure
- `packages/backend/` - NestJS REST API with Prisma ORM (SQLite)
- `packages/frontend/` - Next.js 15 App Router with MUI and React Query
- `packages/shared/` - Shared TypeScript types/utilities

### Backend Modules (`packages/backend/src/`)
- `auth/` - JWT authentication with Passport
- `usuarios/` - User management with roles (Papel)
- `clientes/` - Customer (B2B) management
- `produtos/` - Product management
- `pedidos/` - Order processing with PDF generation
- `pdf/` - Puppeteer-based PDF generation
- `admin/` - Admin endpoints (seed, reset, clean test data)
- `prisma/` - Prisma service wrapper
- `health/` - Health check endpoint

### Frontend Structure (`packages/frontend/src/`)
- `app/` - Next.js App Router pages (login, clientes, produtos, pedidos, relatorios)
- `components/` - React components
- `services/` - API client (axios)
- `hooks/` - React Query hooks

### Database Entities
- `Usuario` - Users with role (Papel) relation
- `Papel` - Roles with JSON permissions
- `Cliente` - B2B customers (CNPJ, razao_social)
- `Produto` - Products with pricing and measurement type
- `Pedido` - Orders with status, total, PDF path
- `ItemPedido` - Order line items

## Production Deployment

**WARNING: This system is live in production on Render.com with real business data.**

- Pushes to `main` trigger automatic deployment
- NEVER run destructive database commands (`prisma migrate reset`) on production
- ALWAYS backup before migrations: `yarn backup`
- Test all changes locally before pushing
- Use feature branches for development

### Logo/Static Assets
- Logo location: `uploads/static/logo.png` (local) or `/opt/render/project/src/uploads/static/logo.png` (Render)
- Assets are versioned in the repo and copied during build
- No manual upload needed on Render

## Key Files

- `packages/backend/prisma/schema.prisma` - Database schema
- `packages/backend/src/main.ts` - Backend entry point
- `packages/frontend/src/app/layout.tsx` - Frontend layout
- `render.yaml` - Render.com deployment config
- `turbo.json` - Turborepo pipeline config
