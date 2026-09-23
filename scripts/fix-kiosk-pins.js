const { PrismaClient } = require('@prisma/client');
const { createHmac } = require('crypto');

const prisma = new PrismaClient();
const pepper = process.env.PIN_PEPPER || 'dev-pin-pepper-change-me';
const hashPin = (pin) => createHmac('sha256', pepper).update(pin).digest('hex');

const pins = {
  'admin@harvest.local': '1001',
  'maya@harvest.local': '2468',
  'luis@harvest.local': '1357',
  'priya@harvest.local': '8642',
  'jordan@harvest.local': '9753',
};

(async () => {
  for (const [email, pin] of Object.entries(pins)) {
    const pinHash = hashPin(pin);
    await prisma.user.update({
      where: { email },
      data: { pinHash },
    });
    console.log(`Updated ${email} to PIN ${pin}`);
  }

  await prisma.$disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
