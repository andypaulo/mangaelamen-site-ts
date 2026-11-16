-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_status_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "total_price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("created_at", "id", "status", "total_price", "user_id") SELECT "created_at", "id", "status", "total_price", "user_id" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Migração de dados de pedidos existentes:
-- 1. Atualizar status de PAID / PENDING para CONFIRMED
UPDATE "orders" SET "status" = 'CONFIRMED' WHERE "status" IN ('PAID', 'PENDING');

-- 2. Criar o evento inicial na linha do tempo para cada pedido existente que ainda não tenha evento (idempotente)
INSERT INTO "order_status_events" ("id", "order_id", "status", "created_at")
SELECT 
    'init-event-' || "o"."id" AS "id",
    "o"."id" AS "order_id",
    'CONFIRMED' AS "status",
    "o"."created_at" AS "created_at"
FROM "orders" "o"
WHERE NOT EXISTS (
    SELECT 1 FROM "order_status_events" "e" WHERE "e"."order_id" = "o"."id"
);
