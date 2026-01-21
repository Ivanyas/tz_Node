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
      email: `getuser-test${Date.now()}@mail.ru`,
      password: await bcrypt.hash('secret123!', 10),
      role: 'USER',
    },
  });
  
  // создаём админа
  admin = await prisma.user.create({
    data: {
      fullName: 'Ivan Ivanyas',
      dateOfBirth: new Date('1995-07-30'),
      email: `getuser-admin${Date.now()}@mail.ru`,
      password: await bcrypt.hash('ivanivan?', 10),
      role: 'ADMIN',
    },
  });
  
  userToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  adminToken = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
  await prisma.$disconnect();
});

describe('GET /users/:id', () => {
  test('пользователь получает себя', async () => {
    const res = await request(app)
      .get(`/users/${user.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.password).toBeUndefined();
  });

  test('админ получает любого пользователя', async () => {
    const res = await request(app)
      .get(`/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });

  test('403 — пользователь не может получить другого пользователя', async () => {
    const res = await request(app)
      .get(`/users/${admin.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.status).toBe(403);
  });

  test('401 — токен не предоставлен', async () => {
    const res = await request(app).get(`/users/${user.id}`);
    
    expect(res.status).toBe(401);
  });

  test('404 — пользователь не найден', async () => {
    const res = await request(app)
      .get('/users/99999')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(404);
  });
});
