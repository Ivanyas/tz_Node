import request from 'supertest';
import app from '../index.js';
import prisma from '../src/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

let user, admin, otherUser, userToken, adminToken, otherUserToken;

beforeAll(async () => {
  // создаём пользователя
  user = await prisma.user.create({
    data: {
      fullName: 'Block Test User',
      dateOfBirth: new Date('1990-01-01'),
      email: `blockuser-test${Date.now()}@mail.ru`,
      password: await bcrypt.hash('secret123!', 10),
      role: 'USER',
    },
  });

  // создаём другого пользователя
  otherUser = await prisma.user.create({
    data: {
      fullName: 'Other User',
      dateOfBirth: new Date('1985-05-15'),
      email: `blockuser-other${Date.now()}@mail.ru`,
      password: await bcrypt.hash('secret123!', 10),
      role: 'USER',
    },
  });

  // создаём админа
  admin = await prisma.user.create({
    data: {
      fullName: 'Block Admin',
      dateOfBirth: new Date('1995-07-30'),
      email: `blockuser-admin${Date.now()}@mail.ru`,
      password: await bcrypt.hash('ivanivan?', 10),
      role: 'ADMIN',
    },
  });

  userToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  adminToken = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET);
  otherUserToken = jwt.sign({ id: otherUser.id, role: otherUser.role }, JWT_SECRET);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'blockuser' } } });
  await prisma.$disconnect();
});

describe('PATCH /users/:id/block', () => {
  test('пользователь блокирует себя', async () => {
    const res = await request(app)
      .patch(`/users/${user.id}/block`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
    expect(res.body.password).toBeUndefined();
  });

  test('админ блокирует любого пользователя', async () => {
    const res = await request(app)
      .patch(`/users/${otherUser.id}/block`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  test('403 — пользователь не может заблокировать другого пользователя', async () => {
    const res = await request(app)
      .patch(`/users/${admin.id}/block`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
  });

  test('401 — токен не предоставлен', async () => {
    const res = await request(app).patch(`/users/${user.id}/block`);

    expect(res.status).toBe(401);
  });

  test('404 — пользователь не найден', async () => {
    const res = await request(app)
      .patch('/users/99999/block')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
