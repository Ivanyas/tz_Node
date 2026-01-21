import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../src/db.js';

const EMAIL = process.env.ADMIN_EMAIL || 'ivanyas@mail.ru';
const PASSWORD = process.env.ADMIN_PASSWORD || 'ivanivan?';

const admin = await prisma.user.upsert({
  where: { email: EMAIL },
  update: {},
  create: {
    email: EMAIL,
    password: await bcrypt.hash(PASSWORD, 10),
    fullName: 'Ivan Ivanyas',
    dateOfBirth: new Date('1995-07-30'),
    role: 'ADMIN',
  },
});

console.log('✅ Admin:', admin.email);
await prisma.$disconnect();
