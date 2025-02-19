# Testes no Backend

## Estrutura
- Testes unitários: `src/**/*.spec.ts`
- Testes de integração: `src/**/*.integration.spec.ts`
- Testes E2E: `test/e2e/**/*.e2e-spec.ts`

## Configuração
- SQLite em ambiente de teste
- Prisma para migrations
- SuperTest para testes de API

## Como Executar

### 1. Testes Unitários
```bash
yarn test
```
- Executa apenas testes unitários
- Usa jest.config.js
- Configurado para mocks de serviços

### 2. Testes de Integração
```bash
yarn test:integration
```
- Executa testes de integração com banco de dados
- Requer DATABASE_URL no .env.test
- Roda migrations antes dos testes

### 3. Testes E2E
```bash
yarn test:e2e
```
- Executa testes end-to-end
- Banco de dados limpo a cada suite
- Migrations e seeds automatizados

### 4. Todos os Testes
```bash
yarn test:all
```
- Executa todos os tipos de teste em sequência

## Estrutura do Monorepo
- Cada pacote tem seu próprio tsconfig.json
- Backend usa Jest + SuperTest
- Frontend usa Jest + Testing Library
- Shared contém tipos e utilidades comuns

## Convenções
- Sufixo .spec.ts para testes unitários
- Sufixo .integration.spec.ts para testes de integração
- Sufixo .e2e-spec.ts para testes E2E
- Mocks em test/mocks/
- Fixtures em test/fixtures/

## Troubleshooting
1. Se o Jest não encontrar o tsconfig.json:
   - Verifique se está usando o caminho correto em moduleNameMapper
   - O rootDir nos arquivos de config do Jest deve estar correto

2. Para erros de banco de dados:
   - Verifique se .env.test existe e está configurado
   - Execute migrations manualmente se necessário:
     ```bash
     DATABASE_URL=file:./test.db yarn prisma migrate deploy
     ```

3. Para erros de módulos não encontrados:
   - Verifique o moduleNameMapper no jest.config.js
   - Confirme que as dependências estão instaladas

4. Para falhas nos testes de integração:
   - Verifique se o banco de teste está sendo limpo
   - Confirme que as migrations estão atualizadas
   - Verifique se os dados de seed estão corretos