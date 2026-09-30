BEGIN;

ALTER TABLE "app"."transactions"
    ADD COLUMN "title" VARCHAR(100);

UPDATE "app"."transactions"
SET "title" = LEFT(REGEXP_REPLACE(BTRIM("note"), '\s+', ' ', 'g'), 100)
WHERE NULLIF(REGEXP_REPLACE(BTRIM("note"), '\s+', ' ', 'g'), '') IS NOT NULL;

UPDATE "app"."transactions" AS transaction_row
SET "title" = LEFT(category."name", 100)
FROM "app"."categories" AS category
WHERE transaction_row."title" IS NULL
  AND transaction_row."category_id" = category."id";

UPDATE "app"."transactions"
SET "title" = CASE "type"
  WHEN 'income' THEN 'Pemasukan'
  WHEN 'expense' THEN 'Pengeluaran'
  ELSE 'Transfer'
END
WHERE "title" IS NULL;

ALTER TABLE "app"."transactions"
    ALTER COLUMN "title" SET NOT NULL;

COMMIT;
