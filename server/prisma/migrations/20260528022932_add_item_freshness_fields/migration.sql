-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "inStock" BOOLEAN,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "onSale" BOOLEAN NOT NULL DEFAULT false;
