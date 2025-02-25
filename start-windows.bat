@echo off
echo ========================================================
echo        Iniciando o Sistema Lino's Panificadora
echo ========================================================

echo Iniciando o sistema...
echo.
echo Para interromper a execucao, pressione Ctrl+C nas janelas dos terminais.
echo.
echo Abrindo servidor backend...
start cmd /k "cd packages\backend && yarn dev"

echo Aguardando inicializacao do backend...
timeout /t 5 /nobreak > NUL

echo Abrindo frontend...
start cmd /k "cd packages\frontend && yarn dev"

echo.
echo ========================================================
echo        Sistema Lino's Panificadora em execucao
echo ========================================================
echo.
echo Acesse a interface no navegador: http://localhost:3000
echo API disponivel em: http://localhost:3001
echo.

timeout /t 5 /nobreak > NUL
start "" http://localhost:3000