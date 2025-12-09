import { PrismaClient, BrandRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo users
  const user1 = await prisma.user.upsert({
    where: { clerkId: "demo_user_1" },
    update: {},
    create: {
      clerkId: "demo_user_1",
      email: "owner@example.com",
      phone: "+1234567890",
      isPlatformAdmin: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { clerkId: "demo_user_2" },
    update: {},
    create: {
      clerkId: "demo_user_2",
      email: "manager@example.com",
      phone: "+1234567891",
    },
  });

  const user3 = await prisma.user.upsert({
    where: { clerkId: "demo_user_3" },
    update: {},
    create: {
      clerkId: "demo_user_3",
      email: "viewer@example.com",
      phone: "+1234567892",
    },
  });

  console.log("✅ Created demo users");

  // Create demo brands
  const brand1 = await prisma.brand.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      description: "A leading provider of innovative solutions",
      isActive: true,
      members: {
        create: [
          {
            userId: user1.id,
            role: BrandRole.OWNER,
          },
          {
            userId: user2.id,
            role: BrandRole.MANAGER,
          },
          {
            userId: user3.id,
            role: BrandRole.VIEWER,
          },
        ],
      },
    },
  });

  const brand2 = await prisma.brand.upsert({
    where: { slug: "tech-startup" },
    update: {},
    create: {
      name: "Tech Startup Inc",
      slug: "tech-startup",
      description: "Revolutionizing the tech industry",
      isActive: true,
      members: {
        create: [
          {
            userId: user1.id,
            role: BrandRole.OWNER,
          },
        ],
      },
    },
  });

  console.log("✅ Created demo brands");

  // Create demo campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      brandId: brand1.id,
      name: "Holiday Rewards",
      description: "Double points during the holiday season",
      pointsPerDollar: 2.0,
      status: "ACTIVE",
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-12-31"),
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      brandId: brand1.id,
      name: "Welcome Bonus",
      description: "Get 100 points when you sign up",
      pointsPerDollar: 1.0,
      status: "ACTIVE",
    },
  });

  console.log("✅ Created demo campaigns");

  console.log("🎉 Seeding completed!");
  console.log("\nDemo data:");
  console.log(`- Users: ${user1.email}, ${user2.email}, ${user3.email}`);
  console.log(`- Brands: ${brand1.name}, ${brand2.name}`);
  console.log(`- Campaigns: ${campaign1.name}, ${campaign2.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

