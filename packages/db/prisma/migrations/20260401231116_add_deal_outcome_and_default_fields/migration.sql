-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "actualClosingDate" TIMESTAMP(3),
ADD COLUMN     "actualDurationMonths" INTEGER,
ADD COLUMN     "collectionStartDate" TEXT,
ADD COLUMN     "companyIncome" TEXT,
ADD COLUMN     "dealComment" TEXT,
ADD COLUMN     "fundsDistribution" TEXT,
ADD COLUMN     "investorIncome" TEXT,
ADD COLUMN     "kycVerification" TEXT,
ADD COLUMN     "propertyRealizationPeriod" TEXT,
ADD COLUMN     "propertySalePrice" TEXT,
ADD COLUMN     "totalDealIncome" TEXT,
ADD COLUMN     "wasDefaulted" BOOLEAN NOT NULL DEFAULT false;
