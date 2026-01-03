/*
  Warnings:

  - You are about to alter the column `ativo` on the `Papel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Papel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INTERNO',
    "nivel" INTEGER NOT NULL DEFAULT 0,
    "permissoes" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Papel" ("ativo", "codigo", "created_at", "descricao", "id", "nivel", "nome", "permissoes", "tipo", "updated_at") SELECT "ativo", "codigo", "created_at", "descricao", "id", "nivel", "nome", "permissoes", "tipo", "updated_at" FROM "Papel";
DROP TABLE "Papel";
ALTER TABLE "new_Papel" RENAME TO "Papel";
CREATE UNIQUE INDEX "Papel_nome_key" ON "Papel"("nome");
CREATE UNIQUE INDEX "Papel_codigo_key" ON "Papel"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
