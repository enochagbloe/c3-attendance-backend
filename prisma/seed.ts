import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('ChangeMe123', 10);
  const adminEmail = 'admin@church.local';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password,
        role: Role.SUPER_ADMIN,
        permissions: [],
      },
    });
    console.log('Seeded default super admin user');
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
