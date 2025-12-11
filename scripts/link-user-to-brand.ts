/**
 * Script to link a Clerk user to an existing brand
 * 
 * Usage:
 *   npx tsx scripts/link-user-to-brand.ts <clerkUserId> <brandId> [role]
 * 
 * Example:
 *   npx tsx scripts/link-user-to-brand.ts user_36g9GpCa8WMRKYj5Tn0Vfi8hXRm <brand-id> OWNER
 */

import { prisma } from "../src/utils/prisma";
import { BrandRole } from "@prisma/client";
import { clerkClient } from "@clerk/express";

const CLERK_USER_ID = process.argv[2];
const BRAND_ID = process.argv[3];
const ROLE = (process.argv[4] || "OWNER") as BrandRole;

if (!CLERK_USER_ID || !BRAND_ID) {
  console.error("Usage: npx tsx scripts/link-user-to-brand.ts <clerkUserId> <brandId> [role]");
  console.error("Example: npx tsx scripts/link-user-to-brand.ts user_36g9GpCa8WMRKYj5Tn0Vfi8hXRm <brand-id> OWNER");
  process.exit(1);
}

if (!Object.values(BrandRole).includes(ROLE)) {
  console.error(`Invalid role: ${ROLE}. Must be one of: ${Object.values(BrandRole).join(", ")}`);
  process.exit(1);
}

async function main() {
  try {
    console.log(`\n🔗 Linking Clerk user ${CLERK_USER_ID} to brand ${BRAND_ID} as ${ROLE}...\n`);

    // Step 1: Check if brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: BRAND_ID },
    });

    if (!brand) {
      console.error(`❌ Brand with ID ${BRAND_ID} not found`);
      console.log("\nAvailable brands:");
      const brands = await prisma.brand.findMany({
        select: { id: true, name: true, slug: true },
      });
      if (brands.length === 0) {
        console.log("  (no brands found)");
      } else {
        brands.forEach((b) => {
          console.log(`  - ${b.name} (${b.slug}): ${b.id}`);
        });
      }
      process.exit(1);
    }

    console.log(`✅ Found brand: ${brand.name} (${brand.slug})`);

    // Step 2: Find or create user by Clerk ID
    let user = await prisma.user.findUnique({
      where: { clerkId: CLERK_USER_ID },
    });

    if (!user) {
      console.log(`📝 User not found in database, creating from Clerk...`);
      try {
        // Try to fetch user data from Clerk
        const clerkUser = await clerkClient.users.getUser(CLERK_USER_ID);
        user = await prisma.user.create({
          data: {
            clerkId: CLERK_USER_ID,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
          },
        });
        console.log(`✅ Created user in database: ${user.id}`);
      } catch (error) {
        console.error("❌ Error fetching Clerk user:", error);
        // Fallback: create user with just Clerk ID
        user = await prisma.user.create({
          data: { clerkId: CLERK_USER_ID },
        });
        console.log(`✅ Created user with fallback: ${user.id}`);
      }
    } else {
      console.log(`✅ Found existing user in database: ${user.id}`);
    }

    // Step 3: Check if membership already exists
    const existingMembership = await prisma.brandMember.findUnique({
      where: {
        userId_brandId: {
          userId: user.id,
          brandId: BRAND_ID,
        },
      },
    });

    if (existingMembership) {
      console.log(`⚠️  User is already a member of this brand with role: ${existingMembership.role}`);
      if (existingMembership.role !== ROLE) {
        console.log(`🔄 Updating role from ${existingMembership.role} to ${ROLE}...`);
        await prisma.brandMember.update({
          where: { id: existingMembership.id },
          data: { role: ROLE },
        });
        console.log(`✅ Updated membership role to ${ROLE}`);
      }
      return;
    }

    // Step 4: Create brand membership
    const membership = await prisma.brandMember.create({
      data: {
        userId: user.id,
        brandId: BRAND_ID,
        role: ROLE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    console.log(`\n✅ Successfully linked user to brand!`);
    console.log(`\nMembership details:`);
    console.log(`  - User: ${membership.user.email || membership.user.id}`);
    console.log(`  - Brand: ${membership.brand.name} (${membership.brand.slug})`);
    console.log(`  - Role: ${membership.role}`);
    console.log(`  - Membership ID: ${membership.id}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

