-- Backfill Item."onSale" now that it is derived from price < originalPrice rather than
-- written by the old refresh heuristic (new price <= 90% of the item's own prior price).
--
-- This recomputes the flag for every row in both directions: items added with a retailer
-- markdown were never flagged at all (create/PATCH never set onSale before this change),
-- and rows the old heuristic flagged without an originalPrice no longer qualify.
--
-- The numeric extraction mirrors shared/price.ts parsePriceToNumber exactly: strip every
-- character outside [0-9.], then treat anything that is not a single positive decimal as
-- unparseable. CASE is used rather than a plain AND chain because Postgres does not
-- guarantee left-to-right evaluation of AND operands -- only CASE guarantees the WHEN guard
-- runs before the THEN branch, which is what keeps the ::numeric cast from ever seeing junk
-- like "1.2.3" or "Sold out" and aborting the migration. Unparseable or NULL prices fall to
-- ELSE FALSE, matching the JS helper's NaN -> 0 -> false.

UPDATE "Item"
SET "onSale" = CASE
  WHEN NULLIF(regexp_replace("price", '[^0-9.]', '', 'g'), '') ~ '^[0-9]*\.?[0-9]+$'
   AND NULLIF(regexp_replace("originalPrice", '[^0-9.]', '', 'g'), '') ~ '^[0-9]*\.?[0-9]+$'
  THEN (regexp_replace("price", '[^0-9.]', '', 'g'))::numeric > 0
   AND (regexp_replace("originalPrice", '[^0-9.]', '', 'g'))::numeric > 0
   AND (regexp_replace("price", '[^0-9.]', '', 'g'))::numeric
       < (regexp_replace("originalPrice", '[^0-9.]', '', 'g'))::numeric
  ELSE FALSE
END;
