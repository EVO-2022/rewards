-- CreateTable
CREATE TABLE "BrandApiKey" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "BrandApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandApiKey_keyHash_key" ON "BrandApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "BrandApiKey_brandId_idx" ON "BrandApiKey"("brandId");

-- CreateIndex
CREATE INDEX "BrandApiKey_keyHash_idx" ON "BrandApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "BrandApiKey_isActive_idx" ON "BrandApiKey"("isActive");

-- AddForeignKey
ALTER TABLE "BrandApiKey" ADD CONSTRAINT "BrandApiKey_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
