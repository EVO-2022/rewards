/**
 * Script to list all available brands
 * 
 * Usage:
 *   npx tsx scripts/list-brands.ts
 */

import { prisma } from "../src/utils/prisma";

async function main() {
  try {
    console.log("\n📋 Available brands:\n");

    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (brands.length === 0) {
      console.log("  (no brands found)\n");
      return;
    }

    brands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name} (${brand.slug})`);
      console.log(`   ID: ${brand.id}`);
      console.log(`   Status: ${brand.isActive ? "Active" : "Inactive"}`);
      console.log(`   Members: ${brand._count.members}`);
      console.log(`   Created: ${brand.createdAt.toLocaleDateString()}`);
      console.log("");
    });

    console.log(`\nTo link a user to a brand, run:`);
    console.log(`  npx tsx scripts/link-user-to-brand.ts <clerkUserId> <brandId> [role]\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

