@echo off
echo Iniciando instalador do Sistema Lino's Panificadora...
echo.

:: Executar como administrador
powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File "".\INSTALAR-LINOS.ps1""' -Verb RunAs"

echo.
if %ERRORLEVEL% NEQ 0 (
    echo Erro ao iniciar o instalador. Por favor, tente clicar com o botao direito no arquivo INSTALAR.bat e selecione "Executar como administrador".
    pause
    exit /b 1
)

exit /b 0