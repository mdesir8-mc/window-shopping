-- AlterTable
ALTER TABLE "Closet" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Closet_shareToken_key" ON "Closet"("shareToken");
