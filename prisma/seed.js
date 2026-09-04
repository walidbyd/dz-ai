const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@dzvid.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123456!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      password: adminPassword,
      credits: 9999,
    },
    create: {
      name: "Super Admin",
      email: adminEmail,
      password: adminPassword,
      role: "ADMIN",
      credits: 9999,
      currentPack: "UNLIMITED",
    },
  });

  console.log(`Admin account created/updated: ${admin.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());