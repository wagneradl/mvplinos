# Guia de Instalação e Uso - Lino's Panificadora

Este guia contém instruções específicas para instalação e execução do sistema em ambiente Windows.

## Requisitos do Sistema

- Windows 10 ou superior
- Conexão à internet (para download de dependências)
- 4GB de RAM mínimo (8GB recomendado)
- 1GB de espaço em disco livre

## Instalação

### Método Automatizado (Recomendado)

1. Clique com o botão direito no arquivo `setup.ps1`
2. Selecione "Executar com PowerShell"
3. Se aparecer um aviso de segurança, digite "S" para continuar
4. Siga as instruções na tela

### Método Manual

Se você encontrar problemas com o método automatizado, siga estas etapas manuais:

1. Instale o Node.js v20 ou superior (https://nodejs.org/)
2. Instale o Yarn globalmente: `npm install -g yarn`
3. Abra um Prompt de Comando como Administrador
4. Navegue até a pasta do projeto: `cd caminho\para\pasta`
5. Instale as dependências: `yarn install`
6. Configure o banco de dados:
   ```
   cd packages\backend
   npx prisma generate
   npx prisma migrate deploy
   cd ..\..
   ```
7. Crie as pastas necessárias:
   ```
   mkdir packages\backend\uploads
   mkdir packages\backend\uploads\pdfs
   mkdir packages\backend\uploads\static
   ```
8. Copie o arquivo da logo:
   ```
   copy packages\backend\src\assets\images\logo.png packages\backend\uploads\static\logo.png
   ```

## Execução do Sistema

### Método Rápido

1. Dê um duplo clique no arquivo `start-windows.bat`
2. O sistema abrirá automaticamente no seu navegador

### Método Manual

1. Abra dois Prompts de Comando
2. No primeiro prompt:
   ```
   cd packages\backend
   yarn dev
   ```
3. No segundo prompt:
   ```
   cd packages\frontend
   yarn dev
   ```
4. Abra o navegador e acesse: http://localhost:3000

## Solução de Problemas

### Erros de Instalação

- **Erro no Prisma**: Execute os comandos no diretório correto dentro de `packages\backend`
- **Erro de permissão**: Execute o PowerShell como administrador
- **Erro de conexão**: Verifique sua conexão com a internet

### Erros de Execução

- **Erro "Cannot find module"**: Execute `yarn install` novamente
- **Erro de banco de dados**: Verifique se o banco de dados foi configurado corretamente
- **Erro de porta em uso**: Verifique se as portas 3000 e 3001 estão disponíveis

## Backup e Restauração

Para realizar um backup do banco de dados:
```
yarn backup
```

Para restaurar um backup:
```
yarn backup:restore
```

## Contato e Suporte

Se você encontrar problemas que não consegue resolver, entre em contato com o suporte técnico:

- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX
