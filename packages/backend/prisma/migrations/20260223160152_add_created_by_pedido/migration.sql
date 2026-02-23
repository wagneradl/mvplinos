-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cliente_id" INTEGER NOT NULL,
    "created_by" INTEGER,
    "data_pedido" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "pdf_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    "pdf_url" TEXT,
    "observacoes" TEXT,
    CONSTRAINT "Pedido_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("cliente_id", "created_at", "data_pedido", "deleted_at", "id", "observacoes", "pdf_path", "pdf_url", "status", "updated_at", "valor_total") SELECT "cliente_id", "created_at", "data_pedido", "deleted_at", "id", "observacoes", "pdf_path", "pdf_url", "status", "updated_at", "valor_total" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
