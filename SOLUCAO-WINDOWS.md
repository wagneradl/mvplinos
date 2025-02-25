# Solução para Instalação no Windows

Este documento oferece instruções específicas para resolver o problema de instalação do Prisma no Windows para o Sistema de Gestão de Pedidos da Lino's Panificadora.

## O Problema

No ambiente Windows, está ocorrendo o seguinte erro durante a instalação:

```
Error: Cannot find module 'C:\Users\Wagner\Desktop\mvplinos\node_modules\node_modules\prisma\build\index.js'
```

Esse erro ocorre devido à estrutura de monorepo com Yarn Workspaces, onde o Prisma tenta procurar seu módulo em um caminho incorreto com `node_modules` duplicado.

## Solução Manual Passo a Passo

Execute os seguintes comandos em sequência no Command Prompt (CMD) do Windows, executado como Administrador:

```batch
REM 1. Navegue até o diretório do projeto
cd C:\Users\Wagner\Desktop\mvplinos

REM 2. Instale ferramentas globais necessárias
npm install -g prisma typescript ts-node

REM 3. Remova node_modules existentes (opcional, mas recomendado)
rmdir /s /q node_modules
rmdir /s /q packages\backend\node_modules
rmdir /s /q packages\frontend\node_modules

REM 4. Navegue até o backend e instale Prisma diretamente
cd packages\backend
npm init -y
npm install prisma@5.0.0 @prisma/client@5.0.0

REM 5. Gere cliente Prisma e aplique migrações
npx prisma generate
npx prisma migrate deploy

REM 6. Crie as pastas necessárias para uploads
mkdir uploads
mkdir uploads\pdfs
mkdir uploads\static

REM 7. Copie a logo para o diretório correto
copy src\assets\images\logo.png uploads\static\logo.png

REM 8. Instale dependências do backend
npm install

REM 9. Navegue até o frontend e instale dependências
cd ..\frontend
npm install

REM 10. Volte para o diretório raiz
cd ..\..
```

## Iniciando o Sistema

Após completar a instalação, você precisará abrir **dois** prompts de comando separados para iniciar o sistema:

### Terminal 1: Backend
```batch
cd packages\backend
npm run dev
```

### Terminal 2: Frontend
```batch
cd packages\frontend
npm run dev
```

Acesse o sistema no navegador: http://localhost:3000

## Soluções Alternativas

Se a solução acima não funcionar, considere estas alternativas:

### Opção 1: Usar WSL (Windows Subsystem for Linux)

1. Instale o WSL2 seguindo as instruções oficiais da Microsoft
2. Instale uma distribuição Linux como Ubuntu via Microsoft Store
3. Clone o repositório dentro do ambiente WSL
4. Siga as instruções normais de instalação para ambientes Unix-like

### Opção 2: Usar Docker

Se Docker estiver disponível no ambiente Windows:

1. Instale Docker Desktop para Windows
2. Clone o repositório
3. Execute o sistema em containers Docker:
   ```
   docker-compose up -d
   ```

## Problemas Comuns e Soluções

### Erro: "before was unexpected at this time"

Este erro ocorre devido a problemas com a codificação de scripts batch no Windows.
Solução: Execute os comandos manualmente um por um, conforme listado na seção "Solução Manual Passo a Passo".

### Erro: Module not found

Se receber erros de módulos não encontrados:
1. Certifique-se de que todas as dependências foram instaladas
2. Verifique se as pastas node_modules existem nas pastas corretas
3. Tente usar npm em vez de yarn para todas as operações

## Contato para Suporte

Se você continuar enfrentando problemas com a instalação no Windows, entre em contato com a equipe de suporte:

- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX
