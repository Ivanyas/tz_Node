import request from 'supertest';
import app from '../index.js';
import prisma from '../src/db.js';
import bcrypt from 'bcrypt';

const login = (data) => request(app).post('/login').send(data);

const testUser = {
  fullName: 'Sergey Brin',
  dateOfBirth: new Date('1970-02-16'),
  email: `login-test${Date.now()}@mail.ru`,
  password: 'secret123!',
};

beforeAll(async () => {
  await prisma.user.create({
    data: {
      ...testUser,
      password: await bcrypt.hash(testUser.password, 10),
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
  await prisma.$disconnect();
});

describe('POST /login', () => {
  test('успешная авторизация', async () => {
    const res = await login({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.password).toBeUndefined();
  });

  test('400 — не все поля заполнены', async () => {
    const res = await login({ email: testUser.email });
    expect(res.status).toBe(400);
  });

  test('401 — неверный email', async () => {
    const res = await login({ email: 'wrong@mail.ru', password: testUser.password });
    expect(res.status).toBe(401);
  });

  test('401 — неверный пароль', async () => {
    const res = await login({ email: testUser.email, password: 'wrongpass!' });
    expect(res.status).toBe(401);
  });
});
