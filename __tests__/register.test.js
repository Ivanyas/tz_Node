import request from 'supertest';
import app from '../index.js';
import prisma from '../src/db.js';

const register = (data) => request(app).post('/register').send(data);

const validUser = {
  fullName: 'Sergey Brin',
  dateOfBirth: '1970-02-16',
  email: `test${Date.now()}@mail.ru`,
  password: 'secret123!',
};

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
  await prisma.$disconnect();
});

describe('POST /register', () => {
  test('создаёт пользователя', async () => {
    const res = await register(validUser);
    expect(res.status).toBe(201);
    expect(res.body.password).toBeUndefined();
  });

  test('400 — не все поля заполнены', async () => {
    const res = await register({ fullName: 'Test' });
    expect(res.status).toBe(400);
  });

  test('400 — неверный email', async () => {
    const res = await register({ ...validUser, email: 'invalid-email' });
    expect(res.status).toBe(400);
  });

  test('400 — короткий пароль', async () => {
    const res = await register({ ...validUser, email: 'short-password-test@mail.ru', password: 'short' });
    expect(res.status).toBe(400);
  });

  test('400 — пароль без спецсимвола', async () => {
    const res = await register({ ...validUser, email: 'no-special-char-test@mail.ru', password: 'password1' });
    expect(res.status).toBe(400);
  });

  test('409 — такой email уже существует', async () => {
    const res = await register(validUser);
    expect(res.status).toBe(409);
  });
});
