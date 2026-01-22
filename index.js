import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './src/db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

app.use(express.json());

// убираем пароль
const safe = ({ password, ...user }) => user;

// проверка токена
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный токен' });
  }
};

app.get('/', (req, res) => {
  res.json({ message: 'Сервис работы с пользователями' });
});

// валидация
const SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>]/;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (pwd) => 
  pwd.length >= 8 && pwd.length <= 16 && SPECIAL_CHARS.test(pwd);

// регистрация
app.post('/register', async (req, res) => {
  const { fullName, dateOfBirth, email, password } = req.body;
  
  if (!fullName || !dateOfBirth || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Неверный формат email' });
  }
  
  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      error: 'Пароль должен быть 8-16 символов и содержать спецсимвол' 
    });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      email,
      password: hashedPassword,
    },
  });
  
  res.status(201).json(safe(user));
});

// авторизация
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  
  const isValidPass = await bcrypt.compare(password, user.password);
  
  if (!isValidPass) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  
  if (!user.isActive) {
    return res.status(403).json({ error: 'Аккаунт деактивирован' });
  }
  
  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ user: safe(user), token });
});

// получение списка пользователей (только админ)
app.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const users = await prisma.user.findMany();

  res.json(users.map(safe));
});

// получение пользователя по ID
app.get('/users/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID' });
  }
  
  // проверка прав доступа
  if (req.user.role !== 'ADMIN' && req.user.id !== id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  
  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  res.json(safe(user));
});

// блокировка пользователя
app.patch('/users/:id/block', auth, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID' });
  }

  if (req.user.role !== 'ADMIN' && req.user.id !== id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  res.json(safe(updatedUser));
});

// ошибки
app.use((err, req, res, next) => {
  if (err.code === 'P2002') return res.status(409).json({ error: 'Email exists' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
