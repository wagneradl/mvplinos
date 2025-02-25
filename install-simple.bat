@echo off
cd packages\backend
call npm init -y
call npm install prisma @prisma/client
call npx prisma generate
call npx prisma migrate deploy
mkdir uploads
mkdir uploads\pdfs
mkdir uploads\static
copy src\assets\images\logo.png uploads\static\logo.png
cd ..\frontend
call npm install
cd ..\..
echo Instalacao concluida! Execute:
echo   - cd packages\backend && npm run dev (Em um terminal)
echo   - cd packages\frontend && npm run dev (Em outro terminal)
echo Depois acesse: http://localhost:3000
pause