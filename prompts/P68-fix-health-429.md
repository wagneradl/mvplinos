# P68 — Fix Health Check 429 no Render

## PROBLEMA

Health check do Render bate em `GET /health` a cada ~5s. O ThrottlerGuard global (APP_GUARD) retorna 429 porque os throttlers nomeados (`login`: 5/60s, `reset`: 3/60s) estão sendo aplicados mesmo com `@SkipThrottle()`.

Com throttlers nomeados no NestJS Throttler v5+, `@SkipThrottle()` sem argumentos pode não skipar throttlers nomeados.

## FIX

Em `packages/backend/src/health/health.controller.ts`:

Mudar:
```typescript
@SkipThrottle()
```

Para:
```typescript
@SkipThrottle({ login: true, reset: true })
```

**OU** (se a versão do throttler não aceitar o objeto), adicionar um throttler `default` com limite alto no `app.module.ts` no array de throttlers:

```typescript
{
  name: 'default',
  ttl: 60 * 1000,
  limit: 100,
},
```

E manter `@SkipThrottle()` como está.

## VALIDAÇÃO

```bash
cd ~/Projetos/Linos/MVP7
yarn workspace backend test --no-coverage 2>&1 | tail -5
yarn workspace backend build 2>&1 | tail -5

git add -A
git commit -m "fix(health): skip named throttlers on health check endpoint

- Explicitly skip login and reset throttlers
- Prevents Render health check 429 errors

fixes: health check intermittent failures"
```

## RESTRIÇÕES

- NÃO alterar lógica de negócio
- Manter 396 testes passando
- NÃO fazer git push
