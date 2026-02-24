# P67 — Fix Build Render: ESM/CJS Compatibility

## CONTEXTO

Projeto Lino's Panificadora — Monorepo `~/Projetos/Linos/MVP7`.
Branch: main. 396 testes. Commit `47b841a`.

**Problema:** Ambos os deploys falham no Render (Node.js v22.14.0).

**Backend falha com:**
```
TypeError: stringWidth is not a function
    at /opt/render/project/src/node_modules/cli-table3/src/utils.js:12:12
```
Causa: `cli-table3` (dep do `@nestjs/cli`) importa `string-width` como CJS, mas v7+ é ESM-only.

**Frontend falha com:**
```
TypeError: mixin.stripAnsi is not a function
    at UI.measurePadding (/opt/render/project/src/node_modules/cliui/build/index.cjs:79:30)
```
Causa: `cliui` (dep do `yargs` do Puppeteer) importa `strip-ansi` como CJS, mas v8+ é ESM-only.

**Causa raiz:** sindresorhus packages (string-width, strip-ansi, ansi-regex) v7+ são ESM-only. Node.js v22 + yarn hoisting = versões incompatíveis resolvidas.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
```

## TAREFA 1 — Pinnar versões CJS via resolutions

### 1.1 Adicionar resolutions no package.json raiz

Em `~/Projetos/Linos/MVP7/package.json`, adicionar bloco `resolutions` (se não existir) no nível raiz do JSON:

```json
{
  "resolutions": {
    "string-width": "4.2.3",
    "strip-ansi": "6.0.1",
    "wrap-ansi": "7.0.0",
    "ansi-regex": "5.0.1",
    "cliui": "7.0.4"
  }
}
```

Estas são as últimas versões CJS de cada pacote. Isso força o Yarn a resolver estas versões em todo o monorepo, evitando que qualquer dependência puxe as versões ESM-only.

### 1.2 Regenerar lockfile

```bash
cd ~/Projetos/Linos/MVP7
yarn install
```

Confirmar que `yarn.lock` foi atualizado com as versões pinnadas.

### 1.3 Verificar que nada quebrou

```bash
yarn workspace backend build 2>&1 | tail -10
yarn workspace frontend build 2>&1 | tail -10
yarn workspace backend test --no-coverage 2>&1 | tail -5
```

Se algo quebrar com as versões pinnadas, tentar alternativa: apenas pinnar `string-width` e `strip-ansi`:
```json
{
  "resolutions": {
    "string-width": "4.2.3",
    "strip-ansi": "6.0.1"
  }
}
```

## TAREFA 2 — Alternativa: Pinnar Node.js no Render

Se as resolutions não forem suficientes, adicionar versão de Node nos envVars de ambos os services no `render.yaml`:

```yaml
      - key: NODE_VERSION
        value: "20.18.1"
```

Node 20 LTS é mais compatível com o ecossistema CJS existente. Adicionar em AMBOS os services (backend e frontend).

**Escolher:** Tentar resolutions primeiro (Tarefa 1). Se o build local passar mas o remoto falhar, aplicar Tarefa 2 também.

## TAREFA 3 — Frontend: Remover Puppeteer do postinstall

O log do frontend mostra que falha durante `npx puppeteer browsers install chrome` no postinstall do backend. Como é monorepo, `yarn install --frozen-lockfile` executa postinstall de todos os workspaces.

Verificar `packages/backend/package.json` — se tem postinstall que roda Puppeteer browser download:

- Se `PDF_MOCK=true` em produção, o Puppeteer browser NÃO é necessário
- Verificar se `PUPPETEER_SKIP_DOWNLOAD=true` já está no render.yaml (está!)
- O problema é que há um script postinstall explícito que ignora a env var

**Fix:** Condicionar o postinstall do backend a NÃO rodar `puppeteer browsers install` quando `PUPPETEER_SKIP_DOWNLOAD=true` ou quando `PDF_MOCK=true`.

Verificar o postinstall script em `packages/backend/package.json` e ajustar.

## VALIDAÇÃO

```bash
cd ~/Projetos/Linos/MVP7
yarn workspace backend build 2>&1 | tail -10
yarn workspace frontend build 2>&1 | tail -10
yarn workspace backend test --no-coverage 2>&1 | tail -5

git add -A
git status
git commit -m "fix: resolve ESM/CJS compatibility for Render deploy

- Pin string-width, strip-ansi, wrap-ansi, ansi-regex to CJS versions
- Fix Puppeteer postinstall when PUPPETEER_SKIP_DOWNLOAD=true
- Regenerate yarn.lock with pinned resolutions

fixes: Render build failures on Node.js v22"
```

## RESTRIÇÕES

- NÃO alterar lógica de negócio
- NÃO alterar testes
- NÃO fazer git push (Wagner faz manualmente)
- Se a Tarefa 1 resolver, NÃO aplicar Tarefa 2 (manter Node 22)
- Manter 396 testes passando
