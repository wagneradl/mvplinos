# Guia de Implantação Atualizado - Sistema de Gestão de Pedidos da Lino's Panificadora

## Correções Implementadas

Realizamos as seguintes correções no sistema para resolver os problemas identificados:

1. **Backend**: 
   - Corrigido o problema do campo `pdf_path` para `caminho_pdf` no serviço de pedidos
   - Corrigido o problema da referência `itemPedido` para `itensPedido` no serviço de pedidos e produtos
   - Adicionados campos obrigatórios faltantes no script de seed (status)

2. **Frontend**:
   - Corrigido o problema de importações não utilizadas no componente da página inicial

## Instruções para Implantação

### 1. Configuração Inicial

1. Certifique-se de ter os requisitos instalados:
   - Node.js 20.x LTS
   - Yarn 1.22+

2. Clone ou extraia o código no servidor/máquina de destino.

### 2. Correção e Instalação

1. Navegue até o diretório do projeto:
   ```bash
   cd /caminho/para/Linos/MVP7
   ```

2. Torne os scripts executáveis:
   ```bash
   chmod +x setup.sh
   chmod +x fix_frontend.sh
   ```

3. Execute o script de setup:
   ```bash
   ./setup.sh
   ```

4. Se ocorrerem problemas no frontend, execute o script de correção:
   ```bash
   ./fix_frontend.sh
   ```

### 3. Inicialização do Sistema

1. Para ambiente de desenvolvimento:
   ```bash
   yarn dev
   ```

2. Para ambiente de produção:
   ```bash
   yarn build
   yarn start
   ```

3. Sistema disponível em:
   - Frontend: http://localhost:3001
   - Backend: http://localhost:3000

### 4. Verificações Pós-Implantação

Após a instalação, verifique:

1. Acesso à interface web
2. Funcionalidade de cadastro de produtos
3. Funcionalidade de cadastro de clientes
4. Criação e visualização de pedidos
5. Geração de PDFs

## Solução de Problemas Comuns

### Erro na Compilação do Frontend

Se ocorrerem erros de TypeScript no frontend:

1. Verifique se o arquivo `packages/frontend/src/app/page.tsx` foi corretamente corrigido
2. Execute o script de correção: `./fix_frontend.sh`
3. Limpe manualmente os caches:
   ```bash
   rm -rf packages/frontend/.next
   rm -rf packages/frontend/node_modules/.cache
   ```

### Erros no Backend

Se ocorrerem erros no backend relacionados aos nomes de campos:

1. Regenere o cliente Prisma:
   ```bash
   npx prisma generate
   ```

2. Verifique se o arquivo `pedidos.service.ts` foi corretamente corrigido

### Erro de Banco de Dados

Se o banco não for criado corretamente:

1. Execute a migração manualmente:
   ```bash
   npx prisma migrate dev
   ```

2. Se necessário, use o Prisma Studio para verificar o banco:
   ```bash
   npx prisma studio
   ```

## Documentação Adicional

Para mais informações, consulte:

- `IMPLANTACAO.md` - Guia detalhado de implantação
- `MANUAL_USUARIO.md` - Manual do usuário do sistema

## Contato para Suporte

Em caso de problemas, entre em contato:
- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX