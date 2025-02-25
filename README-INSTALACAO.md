# Guia de Instalação - Sistema Lino's Panificadora

## Informações Gerais

O Sistema de Gestão de Pedidos da Lino's Panificadora foi projetado para funcionar em ambientes Windows 10 e Windows 11. Este guia fornecerá instruções detalhadas para a instalação e configuração correta do sistema.

## Requisitos do Sistema

- Windows 10 versão 2004 (Build 19041) ou superior / Windows 11
- Mínimo de 4GB RAM (8GB recomendado)
- 15GB de espaço livre em disco
- Privilégios de administrador para instalação

## Método de Instalação Automática (Recomendado)

1. **Iniciar o Instalador**
   - Extraia o arquivo zip do sistema em uma pasta de sua escolha
   - Clique duas vezes no arquivo `INSTALAR.bat`
   - Siga as instruções na tela

2. **O instalador irá**:
   - Verificar os requisitos do sistema
   - Instalar o WSL2 (Windows Subsystem for Linux) se não estiver instalado
   - Instalar o Ubuntu no WSL2
   - Configurar o ambiente para o sistema
   - Criar atalhos na área de trabalho

3. **Após a instalação**:
   - Clique no atalho "Iniciar Lino's Panificadora" na área de trabalho
   - Aguarde o sistema iniciar (pode levar alguns instantes na primeira vez)
   - Acesse o sistema pelo navegador através do atalho "Sistema Lino's Panificadora"

## Método de Instalação Manual (Alternativo)

Caso você encontre problemas com o instalador automático, siga estas etapas:

1. **Instalar o WSL2**:
   - Abra o PowerShell como administrador
   - Execute: `wsl --install`
   - Reinicie o computador quando solicitado
   - Após reiniciar, o Ubuntu será instalado automaticamente
   - Configure seu nome de usuário e senha no Ubuntu

2. **Configurar o Sistema**:
   - Abra o Ubuntu pelo menu Iniciar
   - Navegue até a pasta onde o sistema foi extraído:
     ```bash
     cd /mnt/c/Caminho/Para/Pasta/Sistema
     ```
   - Execute o script de instalação:
     ```bash
     chmod +x scripts/wsl/install-wsl-fixed.sh
     ./scripts/wsl/install-wsl-fixed.sh
     ```
   - Aguarde a conclusão da instalação

3. **Iniciar o Sistema**:
   - No terminal Ubuntu, execute:
     ```bash
     ./start-system.sh
     ```
   - Abra seu navegador e acesse: http://localhost:3000

## Solução de Problemas Comuns

### O WSL2 não instala corretamente
- Verifique se a virtualização está habilitada na BIOS/UEFI
- Execute `wsl --update` no PowerShell como administrador
- Consulte a [documentação oficial da Microsoft](https://docs.microsoft.com/pt-br/windows/wsl/install-manual)

### Erros durante a instalação do sistema
- Verifique se você possui conexão com a internet
- Tente executar o Ubuntu como administrador
- Verifique se o antivírus não está bloqueando a instalação

### O sistema não inicia após a instalação
- Verifique se o WSL2 está em execução: `wsl --status`
- Execute o script de diagnóstico: `./scripts/wsl/test-wsl-env.sh`
- Verifique os logs em: `./logs/backend.log` e `./logs/frontend.log`

## Backup e Restauração de Dados

O sistema possui funcionalidades automáticas de backup:

- **Backup Manual**: Execute `./backup-system.sh` no terminal Ubuntu
- **Restaurar Backup**: Execute `./restore-system.sh` no terminal Ubuntu
- **Configurar Backup Automático**: Use o menu principal (`./wsl-setup.sh`) e selecione a opção 6

## Suporte Técnico

Se você encontrar problemas durante a instalação, entre em contato com o suporte técnico:

- Email: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX

Ao entrar em contato, por favor forneça:
1. Versão do Windows (execute `winver` no Executar)
2. Log de instalação (gerado em `./logs/installation-report.txt`)
3. Descrição detalhada do problema encontrado