import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Add Customer to Test Company ===\n");

  // Find Test Company brand (by name or slug)
  const testCompany = await prisma.brand.findFirst({
    where: {
      OR: [
        { name: { contains: "Test Company" } },
        { name: { contains: "test company" } },
        { slug: { contains: "test-company" } },
        { slug: { contains: "testcompany" } },
      ],
    },
  });

  if (!testCompany) {
    console.log("❌ Test Company brand not found.");
    console.log("\nAvailable brands:");
    const allBrands = await prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
    });
    for (const brand of allBrands) {
      console.log(`  - ${brand.name} (${brand.slug})`);
    }
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Found brand: ${testCompany.name} (${testCompany.id})\n`);

  // Find customer account
  const customerClerkId = "user_38S564F3iNJSI6WHbVe8cLrUjaI";
  const customer = await prisma.user.findUnique({
    where: { clerkId: customerClerkId },
  });

  if (!customer) {
    console.log(`❌ Customer account not found (Clerk ID: ${customerClerkId})`);
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Found customer account: ${customer.id}\n`);

  // Check if already a member
  const existingMembership = await prisma.brandMember.findUnique({
    where: {
      userId_brandId: {
        userId: customer.id,
        brandId: testCompany.id,
      },
    },
  });

  if (existingMembership) {
    console.log(`✅ Customer is already a member (Role: ${existingMembership.role})`);
  } else {
    // Add customer as VIEWER
    const membership = await prisma.brandMember.create({
      data: {
        userId: customer.id,
        brandId: testCompany.id,
        role: "VIEWER",
      },
    });
    console.log(`✅ Added customer to Test Company as VIEWER`);
  }

  // Give customer 200 points if they don't have enough
  const mints = await prisma.rewardLedger.aggregate({
    where: {
      userId: customer.id,
      brandId: testCompany.id,
      type: "MINT",
    },
    _sum: { amount: true },
  });

  const burns = await prisma.rewardLedger.aggregate({
    where: {
      userId: customer.id,
      brandId: testCompany.id,
      type: "BURN",
    },
    _sum: { amount: true },
  });

  const balance =
    (mints._sum.amount?.toNumber() || 0) - (burns._sum.amount?.toNumber() || 0);

  if (balance < 200) {
    const pointsToAdd = 200 - balance;
    await prisma.rewardLedger.create({
      data: {
        brandId: testCompany.id,
        userId: customer.id,
        type: "MINT",
        amount: pointsToAdd,
        reason: "demo_setup",
        metadata: {
          source: "admin_issue_points",
          note: "Demo account setup - starting balance for Test Company",
        },
      },
    });
    console.log(`✅ Added ${pointsToAdd} points (total: 200)`);
  } else {
    console.log(`✅ Customer already has ${balance} points`);
  }

  console.log("\n✅ Setup complete! Customer can now access Test Company portal.");

  await prisma.$disconnect();
}

main().catch(console.error);
