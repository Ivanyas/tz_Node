import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import prisma from './src/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// парс
app.use(express.json());

// убираем пароль
const safe = ({ password, ...user }) => user;

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
  
  res.json(safe(user));
});

// ошибки
app.use((err, req, res, next) => {
  if (err.code === 'P2002') return res.status(409).json({ error: 'Email exists' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// запуск сервера если не в тестовом окружении
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
