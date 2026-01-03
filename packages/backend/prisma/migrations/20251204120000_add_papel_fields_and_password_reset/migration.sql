-- Migration: Adicionar campos ao Papel e criar PasswordResetToken
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Criar nova tabela Papel com todos os campos
CREATE TABLE "new_Papel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INTERNO',
    "nivel" INTEGER NOT NULL DEFAULT 0,
    "permissoes" TEXT NOT NULL,
    "ativo" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Copiar dados existentes, gerando códigos baseados no nome
INSERT INTO "new_Papel" ("id", "nome", "codigo", "descricao", "tipo", "nivel", "permissoes", "ativo", "created_at", "updated_at")
SELECT
    "id",
    "nome",
    CASE
        WHEN "nome" = 'Administrador' THEN 'ADMIN_SISTEMA'
        WHEN "nome" = 'Operador' THEN 'OPERADOR_PEDIDOS'
        ELSE UPPER(REPLACE("nome", ' ', '_'))
    END,
    "descricao",
    'INTERNO',
    CASE
        WHEN "nome" = 'Administrador' THEN 100
        WHEN "nome" = 'Operador' THEN 50
        ELSE 0
    END,
    "permissoes",
    1,
    "created_at",
    "updated_at"
FROM "Papel";

-- Remover tabela antiga e renomear nova
DROP TABLE "Papel";
ALTER TABLE "new_Papel" RENAME TO "Papel";

-- Criar índices únicos
CREATE UNIQUE INDEX "Papel_nome_key" ON "Papel"("nome");
CREATE UNIQUE INDEX "Papel_codigo_key" ON "Papel"("codigo");

-- Criar tabela PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuario_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Criar índice único para token
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
