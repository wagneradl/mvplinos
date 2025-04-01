# Instalador Único do Sistema Lino's Panificadora
# Versão: 1.0
# Data: 25/02/2025
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

# Banner inicial
Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "        INSTALADOR UNIFICADO - SISTEMA LINO'S PANIFICADORA        " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "`nBem-vindo ao instalador unificado do Sistema Lino's Panificadora" -ForegroundColor White
Write-Host "Este assistente irá guiá-lo pelo processo completo de instalação" -ForegroundColor White

# Verificar diretório atual
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "`nDiretório de instalação: $scriptPath" -ForegroundColor Yellow

# Função para verificar a versão do Windows
function Check-WindowsVersion {
    $osInfo = Get-WmiObject -Class Win32_OperatingSystem
    $buildNumber = [int]($osInfo.BuildNumber)
    
    if ($buildNumber -lt 19041) {
        Write-Host "`n[ERRO] Seu Windows está na versão $buildNumber." -ForegroundColor Red
        Write-Host "Este sistema requer Windows 10 versão 2004 (Build 19041) ou superior." -ForegroundColor Red
        Write-Host "Por favor, atualize seu Windows e tente novamente." -ForegroundColor Red
        return $false
    }
    
    Write-Host "`n[OK] Versão do Windows compatível detectada (Build $buildNumber)." -ForegroundColor Green
    return $true
}

# Função para verificar se a virtualização está habilitada
function Check-Virtualization {
    $processorInfo = Get-WmiObject -Class Win32_Processor
    
    if ($processorInfo.VirtualizationFirmwareEnabled -eq $null) {
        Write-Host "`n[AVISO] Não foi possível determinar se a virtualização está habilitada." -ForegroundColor Yellow
        Write-Host "Verifique manualmente no Gerenciador de Tarefas > Desempenho > CPU." -ForegroundColor Yellow
        $response = Read-Host "A virtualização está habilitada? (S/N)"
        return ($response.ToUpper() -eq "S")
    }
    
    if ($processorInfo.VirtualizationFirmwareEnabled -eq $false) {
        Write-Host "`n[ERRO] A virtualização não está habilitada na BIOS/UEFI." -ForegroundColor Red
        Write-Host "Por favor, entre na BIOS/UEFI do seu computador e habilite a virtualização (VT-x, AMD-V)." -ForegroundColor Red
        Write-Host "Consulte o manual do seu computador para instruções específicas." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n[OK] Virtualização habilitada detectada." -ForegroundColor Green
    return $true
}

# Função para verificar WSL
function Check-WSL {
    try {
        # Primeiro tentamos com --status que funciona em versões mais recentes
        try {
            $wslVersion = wsl --status
            if ($wslVersion -match "WSL versão: 2") {
                Write-Host "`n[OK] WSL2 já está instalado e configurado." -ForegroundColor Green
                return $true
            }
        } catch {
            # Se falhar, tentamos verificar usando --list --verbose
            $wslList = wsl --list --verbose 2>$null
            if ($wslList -and $wslList -match "2") {
                Write-Host "`n[OK] WSL2 já está instalado e configurado." -ForegroundColor Green
                return $true
            }
        }

        # Se chegou aqui, o WSL está instalado mas pode não estar na versão 2
        Write-Host "`n[AVISO] WSL está instalado, mas pode não estar na versão 2." -ForegroundColor Yellow
        wsl --set-default-version 2
        Write-Host "WSL2 definido como versão padrão." -ForegroundColor Green
        return $true
    } catch {
        Write-Host "`n[INFO] WSL não está instalado ou configurado." -ForegroundColor Yellow
        return $false
    }
}

# Função para verificar Ubuntu
function Check-Ubuntu {
    try {
        # Tentamos diferentes formas de listar as distribuições
        $wslList = $null
        
        # Primeiro método: wsl --list
        try {
            $wslList = wsl --list
        } catch {
            # Se falhar, tentamos com wsl -l
            try {
                $wslList = wsl -l
            } catch {
                # Não conseguimos listar as distros
                Write-Host "`n[INFO] Não foi possível verificar distribuições WSL." -ForegroundColor Yellow
                return $false
            }
        }
        
        # Verificar se Ubuntu está na lista
        if ($wslList -match "Ubuntu") {
            # Verificar se é possível acessar o Ubuntu
            try {
                $ubuntuTest = wsl -d Ubuntu -e echo "Ubuntu OK" 2>$null
                if ($ubuntuTest -match "Ubuntu OK") {
                    Write-Host "`n[OK] Distribuição Ubuntu encontrada e acessível no WSL." -ForegroundColor Green
                    return $true
                }
            } catch {
                # Ubuntu existe mas pode ter problemas
                Write-Host "`n[AVISO] Ubuntu encontrado, mas pode não estar configurado corretamente." -ForegroundColor Yellow
                return $true
            }
            
            Write-Host "`n[OK] Distribuição Ubuntu encontrada no WSL." -ForegroundColor Green
            return $true
        } else {
            Write-Host "`n[INFO] Ubuntu não está instalado no WSL." -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "`n[INFO] Não foi possível verificar distribuições WSL." -ForegroundColor Yellow
        return $false
    }
}

# Função para instalar WSL2
function Install-WSL2 {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "                     INSTALANDO WSL2                             " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    # Verifica se o WSL já está instalado
    if (Check-WSL) {
        Write-Host "WSL2 já está instalado, pulando esta etapa." -ForegroundColor Green
        return $true
    }
    
    Write-Host "`nInstalando WSL2..." -ForegroundColor Cyan
    
    try {
        # Método automático (Windows 10 2004+ / Windows 11)
        Write-Host "Usando método de instalação automática..." -ForegroundColor Cyan
        wsl --install
        
        Write-Host "`n[OK] Comando de instalação executado com sucesso!" -ForegroundColor Green
        Write-Host "IMPORTANTE: Você precisará reiniciar o computador para completar a instalação." -ForegroundColor Yellow
        
        $restart = Read-Host "`nDeseja reiniciar o computador agora? (S/N)"
        if ($restart.ToUpper() -eq "S") {
            Write-Host "Reiniciando o computador em 10 segundos..." -ForegroundColor Yellow
            Write-Host "Por favor, execute este instalador novamente após a reinicialização." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            Restart-Computer -Force
            exit
        } else {
            Write-Host "`n[AVISO] Por favor, reinicie o computador manualmente e execute este instalador novamente." -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "`n[ERRO] Falha no método automático. Tentando método manual..." -ForegroundColor Red
        
        try {
            # Método manual passo a passo
            dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
            dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
            
            # Baixar e instalar pacote de atualização do kernel do Linux
            $wslUpdateUrl = "https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi"
            $wslUpdateFile = "$env:TEMP\wsl_update_x64.msi"
            
            Write-Host "Baixando pacote de atualização do kernel do Linux..." -ForegroundColor Cyan
            Invoke-WebRequest -Uri $wslUpdateUrl -OutFile $wslUpdateFile
            Start-Process -FilePath $wslUpdateFile -Args "/quiet" -Wait
            
            wsl --set-default-version 2
            
            Write-Host "`n[OK] WSL2 configurado manualmente." -ForegroundColor Green
            Write-Host "IMPORTANTE: Você precisa reiniciar o computador para completar a instalação." -ForegroundColor Yellow
            
            $restart = Read-Host "`nDeseja reiniciar o computador agora? (S/N)"
            if ($restart.ToUpper() -eq "S") {
                Write-Host "Reiniciando o computador em 10 segundos..." -ForegroundColor Yellow
                Write-Host "Por favor, execute este instalador novamente após a reinicialização." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
                Restart-Computer -Force
                exit
            } else {
                Write-Host "`n[AVISO] Por favor, reinicie o computador manualmente e execute este instalador novamente." -ForegroundColor Yellow
                return $false
            }
        } catch {
            Write-Host "`n[ERRO CRÍTICO] Falha na instalação do WSL2: $_" -ForegroundColor Red
            Write-Host "Por favor, consulte a documentação oficial da Microsoft para instalação manual do WSL2:" -ForegroundColor Yellow
            Write-Host "https://docs.microsoft.com/pt-br/windows/wsl/install-manual" -ForegroundColor Yellow
            return $false
        }
    }
    
    return $true
}

# Função para instalar Ubuntu se não estiver instalado
function Install-Ubuntu {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "                     INSTALANDO UBUNTU                           " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    # Verifica se o Ubuntu já está instalado
    if (Check-Ubuntu) {
        Write-Host "Ubuntu já está instalado, pulando esta etapa." -ForegroundColor Green
        return $true
    }
    
    Write-Host "`nInstalando Ubuntu no WSL2..." -ForegroundColor Cyan
    
    try {
        wsl --install -d Ubuntu
        
        Write-Host "`n[OK] Comando de instalação do Ubuntu executado com sucesso!" -ForegroundColor Green
        Write-Host "IMPORTANTE: Aguarde a instalação completa do Ubuntu." -ForegroundColor Yellow
        Write-Host "Uma janela do Ubuntu será aberta. Defina seu nome de usuário e senha quando solicitado." -ForegroundColor Yellow
        
        # Aguardar um tempo para o usuário configurar o Ubuntu
        Write-Host "`nAguarde enquanto o Ubuntu é configurado..." -ForegroundColor Cyan
        Start-Sleep -Seconds 15
        
        # Verificar novamente
        $ubuntuInstalled = Check-Ubuntu
        if ($ubuntuInstalled) {
            Write-Host "`n[OK] Ubuntu instalado com sucesso!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "`n[AVISO] Não foi possível confirmar a instalação do Ubuntu." -ForegroundColor Yellow
            Write-Host "Por favor, verifique se o Ubuntu foi instalado corretamente no WSL." -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "`n[ERRO] Falha na instalação do Ubuntu: $_" -ForegroundColor Red
        Write-Host "Tente instalar manualmente pela Microsoft Store ou pelo comando: wsl --install -d Ubuntu" -ForegroundColor Yellow
        return $false
    }
}

# Função para preparar scripts de instalação WSL
function Prepare-WSLScripts {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "              PREPARANDO SCRIPTS DE INSTALAÇÃO                   " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    $scriptsDir = Join-Path $scriptPath "scripts\wsl"
    $installWslScript = Join-Path $scriptsDir "install-wsl.sh"
    
    if (-not (Test-Path $installWslScript)) {
        Write-Host "`n[ERRO] Script de instalação não encontrado: $installWslScript" -ForegroundColor Red
        Write-Host "Verifique se você está executando este instalador a partir da pasta raiz do sistema." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n[OK] Scripts de instalação encontrados." -ForegroundColor Green
    
    # Tornar scripts executáveis no WSL
    try {
        # Converter caminho Windows para formato WSL
        $wslPath = $scriptPath.Replace("\", "/").Replace(":", "").ToLower()
        $wslPath = "/mnt/" + $wslPath
        
        Write-Host "`nConcedendo permissão de execução aos scripts..." -ForegroundColor Cyan
        wsl -e chmod +x $wslPath/scripts/wsl/*.sh
        wsl -e chmod +x $wslPath/wsl-setup.sh
        wsl -e chmod +x $wslPath/setup.sh
        
        Write-Host "`n[OK] Permissões concedidas com sucesso!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "`n[ERRO] Falha ao preparar scripts: $_" -ForegroundColor Red
        return $false
    }
}

# Função para criar script launcher no WSL
function Create-WSLLauncher {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "                 CRIANDO SCRIPT DE INICIALIZAÇÃO                 " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    # Converter caminho Windows para formato WSL
    $wslPath = $scriptPath.Replace("\", "/").Replace(":", "").ToLower()
    $wslPath = "/mnt/" + $wslPath
    
    # Criar script launcher temporário
    $launcherContent = @"
#!/bin/bash
# Script de inicialização do Sistema Lino's Panificadora
# Gerado automaticamente pelo instalador unificado

echo "================================================================="
echo "      INSTALAÇÃO DO SISTEMA LINO'S PANIFICADORA NO WSL           "
echo "================================================================="
echo ""
echo "Diretório do sistema: $wslPath"
echo ""
echo "Iniciando instalação..."

# Navegar para o diretório do sistema
cd "$wslPath"

# Verificar se o script wsl-setup.sh existe
if [ -f "./wsl-setup.sh" ]; then
    echo "Executando wsl-setup.sh..."
    chmod +x ./wsl-setup.sh
    ./wsl-setup.sh
else
    echo "ERRO: Script wsl-setup.sh não encontrado!"
    echo "Tentando método alternativo..."
    
    if [ -f "./scripts/wsl/install-wsl.sh" ]; then
        echo "Executando install-wsl.sh..."
        chmod +x ./scripts/wsl/install-wsl.sh
        ./scripts/wsl/install-wsl.sh
    else
        echo "ERRO CRÍTICO: Scripts de instalação não encontrados!"
        echo "Por favor, verifique se você está executando o instalador da pasta correta."
        exit 1
    fi
fi

echo ""
echo "Instalação concluída!"
echo "Para iniciar o sistema, execute: ./start-system.sh"
"@
    
    try {
        # Salvar script no WSL
        $launcherContent | wsl -e bash -c "cat > ~/linos-installer.sh"
        wsl -e chmod +x ~/linos-installer.sh
        
        Write-Host "`n[OK] Script de inicialização criado com sucesso!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "`n[ERRO] Falha ao criar script de inicialização: $_" -ForegroundColor Red
        return $false
    }
}

# Função para instalar o sistema no WSL
function Install-LinosSystem {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "              INSTALANDO SISTEMA LINO'S PANIFICADORA             " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    try {
        Write-Host "`nIniciando instalação no ambiente WSL..." -ForegroundColor Cyan
        Write-Host "Este processo pode levar alguns minutos. Por favor, aguarde..." -ForegroundColor Yellow
        
        # Executa script de instalação do WSL
        $result = wsl -e ~/linos-installer.sh
        
        # Exibir saída da instalação
        $result | ForEach-Object { Write-Host $_ }
        
        Write-Host "`n[OK] Sistema Lino's Panificadora instalado com sucesso!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "`n[ERRO] Falha na instalação do sistema: $_" -ForegroundColor Red
        return $false
    }
}

# Função para criar atalhos na área de trabalho
function Create-Shortcuts {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "                     CRIANDO ATALHOS                             " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    # Caminho para a área de trabalho
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    
    # Criar atalho para iniciar o sistema
    $startShortcutPath = Join-Path $desktopPath "Iniciar Linos Panificadora.lnk"
    $wslCommand = "wsl -d Ubuntu -e $scriptPath/start-system.sh"
    
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($startShortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-ExecutionPolicy Bypass -Command `"$wslCommand`""
    $shortcut.WorkingDirectory = $scriptPath
    $shortcut.IconLocation = "shell32.dll,22"
    $shortcut.Save()
    
    # Criar atalho para acessar o sistema no navegador
    $webShortcutPath = Join-Path $desktopPath "Sistema Linos Panificadora.url"
    $webShortcutContent = @"
[InternetShortcut]
URL=http://localhost:3000
IconIndex=13
IconFile=%SystemRoot%\System32\SHELL32.dll
"@
    
    Set-Content -Path $webShortcutPath -Value $webShortcutContent
    
    Write-Host "`n[OK] Atalhos criados na área de trabalho:" -ForegroundColor Green
    Write-Host "1. 'Iniciar Linos Panificadora' - Inicia o sistema" -ForegroundColor White
    Write-Host "2. 'Sistema Linos Panificadora' - Abre o sistema no navegador" -ForegroundColor White
    
    return $true
}

# Função principal
function Main {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "                       VERIFICANDO REQUISITOS                    " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    # Verificar versão do Windows
    $windowsOk = Check-WindowsVersion
    if (-not $windowsOk) {
        Write-Host "`n[ERRO CRÍTICO] Verificação de sistema falhou. Instalação abortada." -ForegroundColor Red
        exit 1
    }
    
    # Verificar virtualização
    $virtOk = Check-Virtualization
    if (-not $virtOk) {
        Write-Host "`n[ERRO CRÍTICO] Verificação de virtualização falhou. Instalação abortada." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n[OK] Todos os requisitos básicos verificados." -ForegroundColor Green
    
    # Confirmar instalação
    Write-Host "`n=================================================================" -ForegroundColor Yellow
    Write-Host "                  CONFIRMAR INSTALAÇÃO                           " -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Yellow
    Write-Host "`nO instalador irá configurar o ambiente completo para o sistema:" -ForegroundColor White
    Write-Host "1. Instalar e configurar o WSL2 (Windows Subsystem for Linux)" -ForegroundColor White
    Write-Host "2. Instalar o Ubuntu no WSL2" -ForegroundColor White
    Write-Host "3. Configurar o ambiente para o Sistema Lino's Panificadora" -ForegroundColor White
    Write-Host "4. Criar atalhos na área de trabalho" -ForegroundColor White
    
    $confirmation = Read-Host "`nDeseja prosseguir com a instalação? (S/N)"
    if ($confirmation.ToUpper() -ne "S") {
        Write-Host "`nInstalação cancelada pelo usuário." -ForegroundColor Yellow
        exit 0
    }
    
    # Instalar WSL2
    $wslOk = Install-WSL2
    if (-not $wslOk) {
        Write-Host "`n[AVISO] A instalação do WSL2 precisa ser concluída antes de prosseguir." -ForegroundColor Yellow
        Write-Host "Por favor, reinicie o computador e execute este instalador novamente." -ForegroundColor Yellow
        exit 0
    }
    
    # Instalar Ubuntu
    $ubuntuOk = Install-Ubuntu
    if (-not $ubuntuOk) {
        Write-Host "`n[AVISO] A instalação do Ubuntu precisa ser concluída antes de prosseguir." -ForegroundColor Yellow
        Write-Host "Por favor, instale o Ubuntu pelo Microsoft Store e execute este instalador novamente." -ForegroundColor Yellow
        exit 0
    }
    
    # Preparar scripts WSL
    $scriptsOk = Prepare-WSLScripts
    if (-not $scriptsOk) {
        Write-Host "`n[ERRO] Falha ao preparar scripts de instalação. Instalação abortada." -ForegroundColor Red
        exit 1
    }
    
    # Criar script launcher
    $launcherOk = Create-WSLLauncher
    if (-not $launcherOk) {
        Write-Host "`n[ERRO] Falha ao criar script de inicialização. Instalação abortada." -ForegroundColor Red
        exit 1
    }
    
    # Instalar sistema
    $systemOk = Install-LinosSystem
    if (-not $systemOk) {
        Write-Host "`n[ERRO] Falha na instalação do sistema. Instalação abortada." -ForegroundColor Red
        exit 1
    }
    
    # Criar atalhos
    $shortcutsOk = Create-Shortcuts
    if (-not $shortcutsOk) {
        Write-Host "`n[AVISO] Não foi possível criar os atalhos, mas o sistema foi instalado." -ForegroundColor Yellow
    }
    
    # Final
    Write-Host "`n=================================================================" -ForegroundColor Green
    Write-Host "             INSTALAÇÃO CONCLUÍDA COM SUCESSO!                  " -ForegroundColor Green
    Write-Host "=================================================================" -ForegroundColor Green
    
    Write-Host "`nO Sistema Lino's Panificadora foi instalado com sucesso!" -ForegroundColor White
    Write-Host "`nPara iniciar o sistema:" -ForegroundColor Cyan
    Write-Host "1. Clique no atalho 'Iniciar Linos Panificadora' na área de trabalho" -ForegroundColor White
    Write-Host "   OU" -ForegroundColor White
    Write-Host "2. Abra o Ubuntu pelo menu Iniciar e execute:" -ForegroundColor White
    Write-Host "   cd $($scriptPath.Replace('\', '/').Replace('C:', '/mnt/c'))" -ForegroundColor Yellow
    Write-Host "   ./start-system.sh" -ForegroundColor Yellow
    
    Write-Host "`nPara acessar o sistema:" -ForegroundColor Cyan
    Write-Host "1. Clique no atalho 'Sistema Linos Panificadora' na área de trabalho" -ForegroundColor White
    Write-Host "   OU" -ForegroundColor White
    Write-Host "2. Abra seu navegador e acesse:" -ForegroundColor White
    Write-Host "   http://localhost:3000" -ForegroundColor Yellow
    
    Write-Host "`nPara obter suporte:" -ForegroundColor Cyan
    Write-Host "Email: suporte@linos.com.br" -ForegroundColor White
    Write-Host "Telefone: (XX) XXXX-XXXX" -ForegroundColor White
    
    Write-Host "`nObrigado por instalar o Sistema Lino's Panificadora!" -ForegroundColor Green
}

# Executa a função principal
Main

# Pausa para o usuário ler as mensagens
Write-Host "`nPressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")