import request from 'supertest';
import app from '../index.js';
import prisma from '../src/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

let user, admin, userToken, adminToken;

beforeAll(async () => {
  // создаём пользователя
  user = await prisma.user.create({
    data: {
      fullName: 'Sergey Brin',
      dateOfBirth: new Date('1970-02-16'),
      email: `getusers-test${Date.now()}@mail.ru`,
      password: await bcrypt.hash('secret123!', 10),
      role: 'USER',
    },
  });

  // создаём админа
  admin = await prisma.user.create({
    data: {
      fullName: 'Ivan Ivanyas',
      dateOfBirth: new Date('1995-07-30'),
      email: `getusers-admin${Date.now()}@mail.ru`,
      password: await bcrypt.hash('ivanivan?', 10),
      role: 'ADMIN',
    },
  });

  userToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  adminToken = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'getusers' } } });
  await prisma.$disconnect();
});

describe('GET /users', () => {
  test('админ получает список пользователей', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0].password).toBeUndefined();
  });

  test('403 — пользователь не может получить список', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  test('401 — токен не предоставлен', async () => {
    const res = await request(app).get('/users');

    expect(res.status).toBe(401);
  });

  test('401 — неверный токен', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
  });
});
