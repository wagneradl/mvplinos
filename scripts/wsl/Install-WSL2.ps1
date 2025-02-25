# Script PowerShell para Instalação do WSL2 no Windows
# Versão: 1.0
# Data: 25/02/2025
# Nome do arquivo: Install-WSL2.ps1
# Este script deve ser executado como Administrador

# Verificar se está sendo executado como Administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Este script precisa ser executado como Administrador." -ForegroundColor Red
    Write-Host "Por favor, clique com o botão direito no PowerShell e selecione 'Executar como administrador'." -ForegroundColor Red
    Start-Sleep -Seconds 5
    exit
}

# Função para verificar a versão do Windows
function Check-WindowsVersion {
    $osInfo = Get-WmiObject -Class Win32_OperatingSystem
    $buildNumber = [int]($osInfo.BuildNumber)
    
    if ($buildNumber -lt 19041) {
        Write-Host "Seu Windows está na versão $buildNumber." -ForegroundColor Yellow
        Write-Host "WSL2 requer Windows 10 versão 2004 (Build 19041) ou superior." -ForegroundColor Red
        Write-Host "Por favor, atualize seu Windows e tente novamente." -ForegroundColor Red
        return $false
    }
    
    Write-Host "Versão do Windows compatível com WSL2 detectada (Build $buildNumber)." -ForegroundColor Green
    return $true
}

# Função para verificar se a virtualização está habilitada
function Check-Virtualization {
    $processorInfo = Get-WmiObject -Class Win32_Processor
    
    # Verificar se o processador suporta virtualização
    if ($processorInfo.VirtualizationFirmwareEnabled -eq $null) {
        Write-Host "Não foi possível determinar se a virtualização está habilitada." -ForegroundColor Yellow
        Write-Host "Verifique manualmente no Gerenciador de Tarefas > Desempenho > CPU." -ForegroundColor Yellow
        $response = Read-Host "A virtualização está habilitada? (S/N)"
        return ($response.ToUpper() -eq "S")
    }
    
    if ($processorInfo.VirtualizationFirmwareEnabled -eq $false) {
        Write-Host "A virtualização não está habilitada na BIOS/UEFI." -ForegroundColor Red
        Write-Host "Por favor, entre na BIOS/UEFI do seu computador e habilite a virtualização (VT-x, AMD-V)." -ForegroundColor Red
        Write-Host "Consulte o manual do seu computador para instruções específicas." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "Virtualização habilitada detectada." -ForegroundColor Green
    return $true
}

# Função para instalar WSL2
function Install-WSL2 {
    Write-Host "`n===== Iniciando a instalação do WSL2 =====`n" -ForegroundColor Cyan
    
    # Método 1: Instalação automática (Windows 10 2004+ / Windows 11)
    Write-Host "Tentando instalação automática do WSL2..." -ForegroundColor Cyan
    
    try {
        # Verifica se o WSL já está instalado
        $wslInstalled = $null
        try { $wslInstalled = Get-Command wsl -ErrorAction SilentlyContinue } catch { }
        
        if ($wslInstalled -eq $null) {
            Write-Host "WSL não encontrado. Instalando..." -ForegroundColor Yellow
            wsl --install
        } else {
            # Se WSL já estiver instalado, verificar se temos distribuições
            $wslList = wsl --list
            if ($wslList -match "Nenhuma distribuição") {
                Write-Host "WSL instalado, mas nenhuma distribuição encontrada. Instalando Ubuntu..." -ForegroundColor Yellow
                wsl --install -d Ubuntu
            } else {
                Write-Host "WSL já instalado com distribuições:" -ForegroundColor Green
                wsl --list
            }
        }
        
        # Definir WSL2 como padrão
        wsl --set-default-version 2
        
        Write-Host "WSL2 instalado e configurado com sucesso!" -ForegroundColor Green
        Write-Host "Se solicitado, reinicie o computador para finalizar a instalação." -ForegroundColor Yellow
        
    } catch {
        Write-Host "Erro na instalação automática: $_" -ForegroundColor Red
        Write-Host "Tentando método manual de instalação..." -ForegroundColor Yellow
        
        # Método 2: Instalação manual passo a passo
        try {
            # Habilitar recurso WSL
            Write-Host "Habilitando feature Windows Subsystem for Linux..." -ForegroundColor Cyan
            dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
            
            # Habilitar Plataforma de Máquina Virtual
            Write-Host "Habilitando feature Virtual Machine Platform..." -ForegroundColor Cyan
            dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
            
            # Baixar e instalar pacote de atualização do kernel do Linux
            Write-Host "Baixando pacote de atualização do kernel do Linux..." -ForegroundColor Cyan
            $wslUpdateUrl = "https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi"
            $wslUpdateFile = "$env:TEMP\wsl_update_x64.msi"
            
            Invoke-WebRequest -Uri $wslUpdateUrl -OutFile $wslUpdateFile
            Start-Process -FilePath $wslUpdateFile -Args "/quiet" -Wait
            
            # Definir WSL2 como padrão
            Write-Host "Definindo WSL2 como versão padrão..." -ForegroundColor Cyan
            wsl --set-default-version 2
            
            # Instalar Ubuntu
            Write-Host "Instalando Ubuntu..." -ForegroundColor Cyan
            wsl --install -d Ubuntu
            
            Write-Host "`nWSL2 instalado manualmente com sucesso!" -ForegroundColor Green
            Write-Host "Por favor, reinicie seu computador e depois execute o Ubuntu pelo menu Iniciar." -ForegroundColor Yellow
            
        } catch {
            Write-Host "Erro na instalação manual: $_" -ForegroundColor Red
            Write-Host "Por favor, tente a instalação manual seguindo o guia: https://docs.microsoft.com/pt-br/windows/wsl/install-manual" -ForegroundColor Yellow
            return $false
        }
    }
    
    return $true
}

# Função para preparar o ambiente para o sistema Lino's Panificadora
function Prepare-LinosEnvironment {
    Write-Host "`n===== Preparando ambiente para o Sistema Lino's Panificadora =====`n" -ForegroundColor Cyan

    # Verificar se já temos o Ubuntu instalado e funcionando
    try {
        $wslStatus = wsl -d Ubuntu -e echo "WSL funcionando"
        Write-Host "Ubuntu WSL está instalado e funcionando." -ForegroundColor Green
    } catch {
        Write-Host "Ubuntu WSL não está em execução ou não está instalado corretamente." -ForegroundColor Red
        Write-Host "Por favor, reinicie o computador e execute novamente este script." -ForegroundColor Yellow
        return $false
    }

    # Verificar se o diretório de código fonte existe
    $sourceDir = Read-Host "Digite o caminho completo para a pasta do sistema Lino's Panificadora"
    if (-not (Test-Path $sourceDir)) {
        Write-Host "Diretório não encontrado: $sourceDir" -ForegroundColor Red
        return $false
    }

    # Copiar o script de instalação para o WSL
    Write-Host "Copiando script de instalação para o WSL..." -ForegroundColor Cyan
    $installScript = Join-Path $sourceDir "scripts\wsl\install-wsl.sh"
    
    # Verificar se o script existe
    if (-not (Test-Path $installScript)) {
        Write-Host "Script de instalação não encontrado: $installScript" -ForegroundColor Red
        return $false
    }
    
    # Criar diretório temporário no WSL
    wsl -d Ubuntu -e mkdir -p ~/temp
    
    # Copiar script para o WSL
    Get-Content $installScript | wsl -d Ubuntu -e bash -c "cat > ~/temp/install-wsl.sh"
    wsl -d Ubuntu -e chmod +x ~/temp/install-wsl.sh
    
    # Instruções para execução do script no WSL
    Write-Host "`n=============================================" -ForegroundColor Green
    Write-Host "  Preparação concluída com sucesso!  " -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "`nPara completar a instalação:" -ForegroundColor Cyan
    Write-Host "1. Abra o Ubuntu pelo menu Iniciar" -ForegroundColor White
    Write-Host "2. Navegue até o diretório do sistema:" -ForegroundColor White
    Write-Host "   cd $($sourceDir.Replace('\', '/').Replace('C:', '/mnt/c'))" -ForegroundColor Yellow
    Write-Host "3. Execute o script de instalação:" -ForegroundColor White
    Write-Host "   ./scripts/wsl/install-wsl.sh" -ForegroundColor Yellow
    Write-Host "`nApós a instalação, você poderá acessar o sistema em:" -ForegroundColor Cyan
    Write-Host "http://localhost:3000" -ForegroundColor Green
    
    return $true
}

# Função principal
function Main {
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "  Instalação do WSL2 para Sistema Lino's Panificadora" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "`nEste script instalará e configurará o WSL2 (Windows Subsystem for Linux)`n" -ForegroundColor White
    
    # Verificar requisitos
    $windowsOk = Check-WindowsVersion
    if (-not $windowsOk) { 
        Write-Host "`nVerificação de requisitos falhou. Instalação abortada." -ForegroundColor Red
        exit
    }
    
    $virtOk = Check-Virtualization
    if (-not $virtOk) {
        Write-Host "`nVerificação de requisitos falhou. Instalação abortada." -ForegroundColor Red
        exit
    }
    
    Write-Host "`nTodos os requisitos verificados com sucesso!" -ForegroundColor Green
    
    $confirmation = Read-Host "`nDeseja prosseguir com a instalação do WSL2? (S/N)"
    if ($confirmation.ToUpper() -ne "S") {
        Write-Host "`nInstalação cancelada pelo usuário." -ForegroundColor Yellow
        exit
    }
    
    # Instalar WSL2
    $installOk = Install-WSL2
    
    if ($installOk) {
        Write-Host "`n=======================================================" -ForegroundColor Green
        Write-Host "  Instalação do WSL2 concluída com sucesso!" -ForegroundColor Green
        Write-Host "=======================================================" -ForegroundColor Green
        
        $setupNow = Read-Host "`nDeseja preparar o ambiente para o Sistema Lino's Panificadora agora? (S/N)"
        if ($setupNow.ToUpper() -eq "S") {
            Prepare-LinosEnvironment
        } else {
            Write-Host "`nVocê pode preparar o ambiente mais tarde executando novamente este script." -ForegroundColor Yellow
        }
        
        Write-Host "`nPróximos passos:" -ForegroundColor Cyan
        Write-Host "1. Reinicie seu computador (se ainda não o fez)" -ForegroundColor White
        Write-Host "2. Abra o Ubuntu pelo menu Iniciar" -ForegroundColor White
        Write-Host "3. Configure seu nome de usuário e senha quando solicitado" -ForegroundColor White
        Write-Host "4. Siga as instruções acima para completar a instalação" -ForegroundColor White
        Write-Host "`nObrigado por instalar o Sistema Lino's Panificadora!" -ForegroundColor Cyan
    } else {
        Write-Host "`n=======================================================" -ForegroundColor Red
        Write-Host "  Ocorreram erros durante a instalação do WSL2." -ForegroundColor Red
        Write-Host "=======================================================" -ForegroundColor Red
        
        Write-Host "`nPor favor, tente os seguintes passos:" -ForegroundColor Yellow
        Write-Host "1. Reinicie seu computador e tente novamente" -ForegroundColor White
        Write-Host "2. Verifique se a virtualização está habilitada na BIOS/UEFI" -ForegroundColor White
        Write-Host "3. Consulte a documentação oficial da Microsoft: https://docs.microsoft.com/pt-br/windows/wsl/install" -ForegroundColor White
    }
}

# Executa o script principal
Main

# Pausa para o usuário ler as mensagens
Write-Host "`nPressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
