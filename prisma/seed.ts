import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac } from "crypto";

const prisma = new PrismaClient();

function hashPin(pin: string) {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper) throw new Error("PIN_PEPPER missing");
  return createHmac("sha256", pepper).update(pin).digest("hex");
}

async function main() {
  const passwordHash = await bcrypt.hash("Employee123!", 12);
  const adminHash = await bcrypt.hash("Admin123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@harvest.local" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "admin@harvest.local",
      passwordHash: adminHash,
      role: Role.ADMIN,
      pinHash: hashPin("1001"),
      hourlyRate: 22.5,
    },
  });

  const employees = [
    { name: "Maya Chen", email: "maya@harvest.local", pin: "2468", rate: 14.5 },
    { name: "Luis Romero", email: "luis@harvest.local", pin: "1357", rate: 13.75 },
    { name: "Priya Shah", email: "priya@harvest.local", pin: "8642", rate: 15.0 },
  ];

  for (const e of employees) {
    await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        name: e.name,
        email: e.email,
        passwordHash,
        role: Role.EMPLOYEE,
        pinHash: hashPin(e.pin),
        hourlyRate: e.rate,
      },
    });
  }

  console.log("Seeded admin + 3 employees.");
  console.log("Admin login: admin@harvest.local / Admin123!");
  console.log("Employee login password: Employee123!");
  console.log("Kiosk PINs — Alex: 1001, Maya: 2468, Luis: 1357, Priya: 8642");
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
