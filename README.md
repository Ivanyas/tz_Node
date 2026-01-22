# User Support Service

API для работы с пользователями.

## Установка

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

Создать `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
```

## Запуск

```bash
npm start
```

## API

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| POST | /register | Регистрация | Все |
| POST | /login | Авторизация | Все |
| GET | /users | Список пользователей | Админ |
| GET | /users/:id | Получить пользователя | Админ / свой профиль |
| PATCH | /users/:id/block | Заблокировать | Админ / себя |

Все защищённые эндпоинты требуют заголовок:
```
Authorization: Bearer <token>
```

### Пример использования

```bash
# Регистрация
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Sergey Brin","dateOfBirth":"1973-08-21","email":"sergey@mail.ru","password":"mypass123!"}'

# Авторизация (возвращает token)
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sergey@mail.ru","password":"mypass123!"}'

# Запрос с токеном
curl http://localhost:3000/users/1 \
  -H "Authorization: Bearer eyJhbGc..."
```

Тестовый админ (после `npx prisma db seed`):
- Email: `ivanyas@mail.ru`
- Пароль: `ivanivan?`

## Тесты

```bash
npm test
```
