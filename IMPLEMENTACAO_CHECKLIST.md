# Checklist de Implementação - Sistema Lino's Panificadora

Este documento fornece uma lista de verificação para garantir uma implementação bem-sucedida do sistema no ambiente do cliente.

## Verificação Pré-Instalação

### Requisitos do Sistema
- [ ] Windows 10 versão 2004 (Build 19041) ou superior / Windows 11
- [ ] Mínimo de 4GB RAM disponível (verificar no Gerenciador de Tarefas)
- [ ] Mínimo de 15GB de espaço livre em disco
- [ ] Virtualização habilitada na BIOS/UEFI (verificar no Gerenciador de Tarefas -> CPU)
- [ ] Acesso de administrador ao sistema

### Preparação do Ambiente
- [ ] Desabilitar temporariamente antivírus (pode interferir na instalação do WSL)
- [ ] Fechar todos os aplicativos em execução
- [ ] Fazer backup dos dados importantes (por precaução)
- [ ] Verificar conexão com a internet (necessária para baixar dependências)

## Processo de Instalação

### WSL2
- [ ] Abrir PowerShell como administrador
- [ ] Executar `wsl --status` para verificar se o WSL já está instalado
- [ ] Se não estiver instalado, usar o instalador unificado
- [ ] Verificar se a instalação do WSL2 requer reinicialização do sistema

### Ubuntu
- [ ] Verificar se o Ubuntu está instalado no WSL
- [ ] Se não estiver, instalar usando `wsl --install -d Ubuntu`
- [ ] Configurar nome de usuário e senha para Ubuntu
- [ ] Verificar acesso ao Ubuntu (`wsl -d Ubuntu`)

### Sistema Lino's Panificadora
- [ ] Extrair todos os arquivos do sistema na máquina do cliente
- [ ] Executar o script `INSTALAR.bat` como administrador
- [ ] Seguir todas as instruções na tela
- [ ] Executar o script de correção do Prisma (`scripts/fix-prisma.bat` no Windows ou `scripts/fix-prisma.sh` no WSL)
- [ ] Verificar se os atalhos foram criados na área de trabalho

## Verificação Pós-Instalação

### Inicialização do Sistema
- [ ] Clicar no atalho "Iniciar Lino's Panificadora"
- [ ] Verificar se o sistema inicia sem erros
- [ ] Verificar se é possível acessar http://localhost:3000 no navegador
- [ ] Verificar se a interface do sistema carrega corretamente

### Funcionalidades Principais
- [ ] Verificar cadastro de produtos
- [ ] Verificar cadastro de clientes
- [ ] Verificar criação de pedidos
- [ ] Verificar geração de PDFs
- [ ] Verificar relatórios

### Backup do Sistema
- [ ] Verificar se o sistema de backup funciona (`./backup-system.sh`)
- [ ] Restaurar um backup de teste (`./restore-system.sh`)
- [ ] Configurar backup automático

## Solução de Problemas Comuns

### Se o WSL não instalar corretamente
- [ ] Verificar se a virtualização está habilitada na BIOS/UEFI
- [ ] Executar `dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all`
- [ ] Executar `dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all`
- [ ] Reiniciar o computador
- [ ] Baixar e instalar manualmente o pacote de atualização do kernel Linux: https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi

### Se o Ubuntu não instalar corretamente
- [ ] Tentar instalar pela Microsoft Store
- [ ] Verificar logs: `wsl --update --verbose`
- [ ] Tentar redefinir o WSL: `wsl --shutdown`

### Se o sistema não iniciar corretamente
- [ ] Verificar logs em `logs/backend.log` e `logs/frontend.log`
- [ ] Verificar se as portas 3000 e 3001 estão disponíveis
- [ ] Executar o script de diagnóstico: `./scripts/wsl/status-report.sh`

## Informações de Contato para Suporte

- Suporte técnico: suporte@linos.com.br
- Telefone: (XX) XXXX-XXXX
- Horário de atendimento: Segunda a Sexta, 9h às 18h

## Notas Adicionais para o Implementador

1. **Sempre inicie os procedimentos com uma explicação clara para o cliente**
2. **Documente quaisquer alterações específicas feitas durante a implementação**
3. **Forneça treinamento básico para o cliente sobre uso e manutenção do sistema**
4. **Registre os dados e versões do ambiente onde o sistema foi instalado**