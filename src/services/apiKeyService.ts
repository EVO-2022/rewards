import { prisma } from "../utils/prisma";
import { generateApiKey } from "../utils/apiKeys";

/**
 * Create a brand API key
 * This is the core logic shared between authenticated and test routes
 */
export async function createBrandApiKeyForBrandId(
  brandId: string,
  name: string
): Promise<{ brandApiKey: any; apiKey: string }> {
  // Verify brand exists
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
  });

  if (!brand) {
    throw new Error("Brand not found");
  }

  // Generate API key
  const { rawKey, hash } = generateApiKey();

  // Save to database
  const brandApiKey = await prisma.brandApiKey.create({
    data: {
      brandId,
      name,
      keyHash: hash,
      isActive: true,
    },
  });

  return { brandApiKey, apiKey: rawKey };
}
