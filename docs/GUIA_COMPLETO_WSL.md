# Guia Completo: Instalação do Sistema Lino's Panificadora usando WSL2

Este guia fornece instruções detalhadas para instalar e configurar o Sistema de Gestão de Pedidos da Lino's Panificadora em ambiente Windows usando WSL2 (Windows Subsystem for Linux).

## Índice

1. [Introdução](#introdução)
2. [Por que usar WSL2?](#por-que-usar-wsl2)
3. [Requisitos do Sistema](#requisitos-do-sistema)
4. [Instalação do WSL2](#instalação-do-wsl2)
5. [Instalação do Sistema Lino's Panificadora](#instalação-do-sistema-linos-panificadora)
6. [Operações Básicas](#operações-básicas)
7. [Backup e Restauração](#backup-e-restauração)
8. [Solução de Problemas](#solução-de-problemas)
9. [Perguntas Frequentes](#perguntas-frequentes)

## Introdução

O Sistema de Gestão de Pedidos da Lino's Panificadora foi desenvolvido originalmente para ambientes macOS/Linux. Para garantir a compatibilidade com Windows, a solução recomendada é usar o WSL2 (Windows Subsystem for Linux), que fornece um ambiente Linux completo dentro do Windows.

## Por que usar WSL2?

1. **Compatibilidade garantida**: O sistema funciona exatamente como foi projetado, sem modificações.
2. **Performance nativa**: O WSL2 oferece performance semelhante ao Linux nativo.
3. **Solução oficial da Microsoft**: Bem suportada e integrada ao Windows 10/11.
4. **Evita problemas conhecidos**: Contorna incompatibilidades do Prisma ORM com estruturas de monorepo no Windows.
5. **Facilidade de manutenção**: Atualizações e suporte futuros são simplificados.

## Requisitos do Sistema

- Windows 10 versão 2004 (Build 19041) ou superior / Windows 11
- Mínimo de 4GB RAM (8GB recomendado)
- 25GB de espaço livre em disco
- Processador com suporte à virtualização (habilitada na BIOS/UEFI)
- Privilégios de administrador (para instalação inicial)

## Instalação do WSL2

### Método Automático (Recomendado)

1. Abra a pasta do sistema Lino's Panificadora
2. Clique com o botão direito no arquivo `scripts/wsl/Install-WSL2.ps1`
3. Selecione "Executar com PowerShell"
4. Siga as instruções na tela

### Método Manual

Se o método automático falhar, siga estas etapas:

1. Abra o PowerShell como administrador
2. Execute o comando:
   ```powershell
   wsl --install
   ```
3. Reinicie o computador quando solicitado
4. Abra o PowerShell novamente e execute:
   ```powershell
   wsl --install -d Ubuntu
   ```
5. Configure seu nome de usuário e senha quando solicitado

## Instalação do Sistema Lino's Panificadora

Após instalar o WSL2, siga estas etapas:

1. Abra o Ubuntu pelo menu Iniciar do Windows
2. Navegue até a pasta do sistema:
   ```bash
   cd /mnt/c/Caminho/Para/Pasta/Linos/MVP7
   ```
3. Execute o script de instalação:
   ```bash
   ./scripts/wsl/install-wsl.sh
   ```
4. Aguarde o processo de instalação ser concluído
5. Execute o script de configuração principal:
   ```bash
   ./wsl-setup.sh
   ```

## Operações Básicas

### Iniciar o Sistema

```bash
./start-system.sh
```

O sistema estará disponível em: http://localhost:3000

### Parar o Sistema

```bash
./stop-system.sh
```

### Verificar Status

```bash
./scripts/wsl/status-report.sh
```

### Menu Principal de Gerenciamento

```bash
./wsl-setup.sh
```

Este menu oferece acesso a todas as funcionalidades do sistema:
- Iniciar/parar o sistema
- Gerenciar backups
- Verificar status
- Configurar backups automáticos
- Testar o ambiente
- Reinstalar o sistema (se necessário)

## Backup e Restauração

### Backup Manual

```bash
./backup-system.sh
```

Este comando cria um backup completo do banco de dados e o armazena na pasta `backups/`.

### Configurar Backup Automático

```bash
./scripts/wsl/setup-auto-backup.sh
```

Você pode configurar a frequência dos backups automáticos (diário, a cada 12 horas, etc.).

### Restaurar Backup

```bash
./restore-system.sh [caminho_do_backup]
```

Se não especificar o caminho do backup, o script mostrará uma lista de backups disponíveis para escolher.

## Solução de Problemas

### Verificar Ambiente

```bash
./scripts/wsl/test-wsl-env.sh
```

Este script verifica se o ambiente está configurado corretamente e identifica possíveis problemas.

### Gerar Relatório de Status

```bash
./scripts/wsl/status-report.sh
```

Gera um relatório detalhado sobre o estado atual do sistema, útil para diagnóstico e suporte remoto.

### Reinstalar o Sistema

Se encontrar problemas que não consegue resolver:

1. Execute o menu principal: `./wsl-setup.sh`
2. Selecione a opção 8 (Reinstalar sistema)

## Perguntas Frequentes

### O sistema não inicia. O que fazer?

Verifique os logs em `logs/backend.log` e `logs/frontend.log`. Execute o relatório de status para diagnóstico detalhado.

### Como acessar o sistema após a instalação?

Abra o navegador e acesse http://localhost:3000

### Como atualizar o sistema?

Atualizações futuras serão distribuídas como pacotes. Para aplicar, pare o sistema, faça um backup e então execute o script de atualização fornecido.

### O banco de dados está seguro?

Sim. Por padrão, o sistema faz backups automáticos diários e mantém os 10 backups mais recentes. Você pode ajustar esta configuração.

### Posso usar o sistema offline?

Sim, uma vez instalado, o sistema funciona completamente offline.

### Como obter suporte técnico?

Execute o relatório de status e envie o arquivo gerado para suporte@linos.com.br

---

Este guia foi preparado para facilitar a instalação e uso do Sistema Lino's Panificadora em ambiente Windows usando WSL2. Para mais informações, consulte a documentação técnica completa ou entre em contato com o suporte técnico.

Data de atualização: 25/02/2025
