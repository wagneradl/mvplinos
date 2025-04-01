# Plano de Implantação Simplificado para Windows

## Contexto

O Sistema de Gestão de Pedidos da Lino's Panificadora está totalmente funcional em ambientes Unix-like (macOS/Linux). Porém, a implantação em Windows tem enfrentado desafios com o Prisma ORM em configuração de monorepo. Após tentativas de configuração com Docker, estamos optando pela abordagem mais confiável: WSL (Windows Subsystem for Linux).

## Solução: WSL2

O WSL2 permite executar um ambiente Linux completo dentro do Windows, eliminando todos os problemas de compatibilidade.

### 1. Pré-requisitos no computador do cliente

- Windows 10 versão 1903+ ou Windows 11
- Acesso de administrador

### 2. Instalação do WSL2 (Simplificada)

1. Abra PowerShell como Administrador
2. Execute:
   ```powershell
   wsl --install
   ```
3. Reinicie o computador
4. O Ubuntu será instalado automaticamente
5. Defina um nome de usuário e senha quando solicitado

### 3. Instalação do Sistema

1. Abra o Ubuntu no menu Iniciar
2. Execute os seguintes comandos:

```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js e Yarn
sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn

# Navegar para a pasta do Windows onde está o código
cd /mnt/c/caminho/para/Linos/MVP7

# Corrigir problemas do Prisma
chmod +x ./scripts/fix-prisma.sh
./scripts/fix-prisma.sh

# Instalar dependências e iniciar
yarn install
yarn dev
```

### 4. Acesso ao Sistema

O sistema estará disponível em http://localhost:3000, acessível pelo navegador normal do Windows.

## Instruções para Manutenção

### Backup de Dados

```bash
cd /mnt/c/caminho/para/Linos/MVP7
yarn backup
```

### Atualização do Sistema

```bash
cd /mnt/c/caminho/para/Linos/MVP7
git pull  # Se estiver usando controle de versão
yarn install
```

## Vantagens desta Abordagem

1. **Sem alterações no código**: Usa o mesmo código que já funciona em ambientes Unix-like
2. **Confiabilidade**: Elimina todos os problemas de compatibilidade do Windows
3. **Facilidade**: WSL2 é uma tecnologia oficial da Microsoft, bem suportada e documentada
4. **Desempenho**: O WSL2 oferece desempenho quase nativo
5. **Suporte**: Fácil de dar suporte, pois estaremos usando o mesmo ambiente que já conhecemos

## Em caso de problemas

Se houver qualquer problema com a execução no WSL2, a sequência de comandos a seguir pode resolver a maioria das situações:

```bash
cd /mnt/c/caminho/para/Linos/MVP7
rm -rf node_modules
rm -rf packages/*/node_modules
yarn cache clean
yarn install
cd packages/backend
npx prisma generate
npx prisma migrate deploy
cd ../..
yarn dev
```
