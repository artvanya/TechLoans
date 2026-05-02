-- Removes every deal shown on investor Track record (isPortfolio = true).
-- Run from packages/db: see root package.json / docs or README for DATABASE_URL.
-- Does not delete R2 objects; clean bucket separately if needed.

DELETE FROM "Payout" p
USING "Investment" i
WHERE p."investmentId" = i.id
  AND i."dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "Transaction" t
USING "Investment" i
WHERE t."investmentId" = i.id
  AND i."dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "Investment"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "DealImage"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "DealDocument"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "DealUpdate"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "ServicingLog"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "RepaymentScheduleItem"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "AutoInvestMatch"
WHERE "dealId" IN (SELECT id FROM "Deal" WHERE "isPortfolio" = true);

DELETE FROM "Deal" WHERE "isPortfolio" = true;
