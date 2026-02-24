# Handoff M4 → M5

## Estado do Sistema

### Milestones Completos
- M1 Fundação ✅ (211 testes)
- M2 Segurança ✅ (222 testes)
- M3 Portal Cliente F1 ✅ (329 testes)
- M4 Portal Cliente F2 ✅ (396 testes)

### Tag
`m4-portal-cliente-f2` — commit `b7ea257`

### O que foi entregue no M4
- **E1 Dashboard Cliente:** Endpoint `GET /pedidos/dashboard` com KPIs + UI com cards, status breakdown e pedidos recentes
- **E2 Email Notificação:** EventEmitter fire-and-forget para notificar cliente por email quando status muda (apenas transições INTERNO)
- **E3 Sub-usuários Portal:** Tenant isolation completa no backend + página `/portal/usuarios` para CLIENTE_ADMIN gerenciar equipe
- **E4 Relatórios Portal:** Página `/portal/relatorios` reutilizando RelatorioVendas, com export PDF
- **E5 Bloqueio Edição:** Constante `ESTADOS_BLOQUEIO_EDICAO` impede edição de pedidos após CONFIRMADO
- **F0 Observabilidade:** Sentry (graceful sem DSN), StructuredLoggerService (JSON em produção), Health check com DB connectivity

### Backend — Endpoints Atuais

#### Auth (`/auth`)
| Método | Rota | Permissão |
|--------|------|-----------|
| POST | `/auth/login` | Pública |
| POST | `/auth/registrar-cliente` | Pública |
| POST | `/auth/refresh` | Pública |
| POST | `/auth/logout` | JwtAuthGuard |
| GET | `/auth/me` | JwtAuthGuard |
| POST | `/auth/reset-solicitar` | Pública |
| GET | `/auth/reset-validar/:token` | Pública |
| POST | `/auth/reset-confirmar` | Pública |

#### Usuários (`/usuarios`)
| Método | Rota | Roles | Permissão |
|--------|------|-------|-----------|
| POST | `/usuarios` | ADMIN_SISTEMA, GERENTE_COMERCIAL, CLIENTE_ADMIN | `usuarios:criar` |
| GET | `/usuarios` | — | `usuarios:listar` |
| GET | `/usuarios/papeis` | — | `papeis:listar` |
| GET | `/usuarios/:id` | — | `usuarios:ver` |
| PATCH | `/usuarios/:id` | — | `usuarios:editar` |
| DELETE | `/usuarios/:id` | ADMIN_SISTEMA, CLIENTE_ADMIN | `usuarios:desativar` |

#### Clientes (`/clientes`)
| Método | Rota | Permissão |
|--------|------|-----------|
| POST | `/clientes` | `clientes:criar` |
| GET | `/clientes` | `clientes:listar` |
| GET | `/clientes/cnpj/:cnpj` | `clientes:ver` |
| GET | `/clientes/:id` | `clientes:ver` |
| PATCH | `/clientes/:id` | `clientes:editar` |
| DELETE | `/clientes/:id` | `clientes:desativar` |
| PATCH | `/clientes/:id/aprovar` | `clientes:editar` |
| PATCH | `/clientes/:id/rejeitar` | `clientes:editar` |

#### Produtos (`/produtos`)
| Método | Rota | Permissão |
|--------|------|-----------|
| POST | `/produtos` | `produtos:criar` |
| GET | `/produtos` | `produtos:listar` |
| GET | `/produtos/:id` | `produtos:ver` |
| PATCH | `/produtos/:id` | `produtos:editar` |
| DELETE | `/produtos/:id` | `produtos:desativar` |

#### Pedidos (`/pedidos`)
| Método | Rota | Permissão |
|--------|------|-----------|
| POST | `/pedidos` | `pedidos:criar` |
| GET | `/pedidos` | `pedidos:listar` |
| GET | `/pedidos/dashboard` | `pedidos:listar` |
| GET | `/pedidos/reports/summary` | `relatorios:ver` |
| GET | `/pedidos/reports/pdf` | `relatorios:exportar` |
| GET | `/pedidos/:id` | `pedidos:ver` |
| GET | `/pedidos/:id/pdf` | `pedidos:ver` |
| PATCH | `/pedidos/:id` | `pedidos:editar` |
| PATCH | `/pedidos/:id/status` | `pedidos:editar` |
| PATCH | `/pedidos/:id/itens/:itemId` | `pedidos:editar` |
| DELETE | `/pedidos/:id` | `pedidos:cancelar` |
| POST | `/pedidos/:id/repeat` | `pedidos:criar` |

#### Admin (`/admin`)
| Método | Rota | Permissão |
|--------|------|-----------|
| POST | `/admin/seed` | `usuarios` (write) |
| POST | `/admin/reset-database` | `usuarios` (delete) |
| POST | `/admin/clean-test-data` | `usuarios` (delete) |

#### Health (`/health`)
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/health` | Pública |

### Frontend — Páginas Portal Atuais
| Rota | Funcionalidade |
|------|---------------|
| `/portal/dashboard` | Dashboard com KPIs reais, status breakdown, pedidos recentes |
| `/portal/catalogo` | Catálogo de produtos com busca e filtro |
| `/portal/pedidos` | Listagem de pedidos com filtro por status e paginação |
| `/portal/pedidos/novo` | Criação de pedido com carrinho |
| `/portal/pedidos/[id]` | Detalhe do pedido com timeline, itens, PDF, cancelamento |
| `/portal/relatorios` | Relatórios com filtro de data e export PDF |
| `/portal/usuarios` | Gestão de sub-usuários (apenas CLIENTE_ADMIN) |

### Frontend — Páginas Admin Atuais
| Rota | Funcionalidade |
|------|---------------|
| `/dashboard` | Dashboard administrativo |
| `/clientes` | Gestão de clientes (CRUD + aprovar/rejeitar) |
| `/clientes/novo` | Novo cliente |
| `/clientes/[id]/editar` | Editar cliente |
| `/produtos` | Gestão de produtos (CRUD) |
| `/produtos/novo` | Novo produto |
| `/produtos/[id]/editar` | Editar produto |
| `/usuarios` | Gestão de usuários (CRUD) |
| `/usuarios/novo` | Novo usuário |
| `/usuarios/[id]/editar` | Editar usuário |
| `/usuarios/papeis` | Gestão de papéis |
| `/pedidos` | Gestão de pedidos (CRUD) |
| `/pedidos/novo` | Novo pedido |
| `/pedidos/[id]` | Detalhe do pedido |
| `/pedidos/[id]/print` | Impressão do pedido |
| `/relatorios` | Relatórios com filtros avançados |

### Frontend — Páginas Públicas
| Rota | Funcionalidade |
|------|---------------|
| `/` | Landing page |
| `/login` | Login |
| `/registrar` | Auto-registro de cliente |
| `/esqueci-senha` | Solicitar reset de senha |
| `/reset-senha` | Confirmar reset de senha |

### Infraestrutura
- **Banco:** SQLite com disco persistente Render
- **Email:** Resend (mock disponível para testes)
- **PDF:** Puppeteer (mock disponível para testes)
- **Error tracking:** Sentry (precisa DSN em produção)
- **Logging:** JSON structured em produção, colorido em dev
- **Deploy:** Render.com auto-deploy main
- **Auth:** JWT com refresh token + password reset via email

### ADRs Pendentes
- ADR-004: SQLite → PostgreSQL (ADIADA para antes do go-live)
- ADR-005: Puppeteer → alternativa (MONITORAR)

### Testes
- **Total:** 396
- **Suites:** 20
- **Tempo:** ~8s
- **Cobertura:** 66.5% statements, 65.6% lines (informativo)
- **Áreas sem cobertura:** frontend React (zero), PdfService (zero unit), SupabaseService (zero unit)
- **Áreas bem cobertas:** auth (95%+), pedidos service (75%), usuarios service (94%), email service (85%+)

### Sugestões para M5
1. **Deploy produção:** Configurar Sentry DSN, Resend API key, variáveis de ambiente
2. **Onboarding primeiro cliente:** Testar fluxo completo de registro → aprovação → primeiro pedido
3. **Melhorias UX:** Notificações push (web), busca global, filtros salvos
4. **Performance:** Cache de catálogo, otimizar queries de dashboard
5. **Segurança:** Rate limiting mais granular, audit log, 2FA
6. **Migração DB:** Planejar SQLite → PostgreSQL (ADR-004)
7. **Testes frontend:** Adicionar testes de componentes React com Testing Library
8. **CI/CD:** GitHub Actions pipeline com lint + test + build + deploy
