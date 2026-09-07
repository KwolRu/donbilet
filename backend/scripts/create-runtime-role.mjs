#!/usr/bin/env node
/**
 * Создаёт логин-роль приложения и включает её в группу `app_runtime`.
 *
 *   npm run db:runtime-role
 *
 * Зачем отдельная роль: RLS-политики не применяются к владельцу таблиц. Пока
 * приложение подключается той же ролью, что выполняет миграции, tenant-изоляция
 * на уровне БД не работает вовсе. Роль без BYPASSRLS и без владения таблицами —
 * обязательное условие, чтобы третий рубеж защиты (ADR-0002 §3) существовал.
 *
 * Запускается ролью-администратором (DATABASE_URL), создаёт роль из
 * DATABASE_RUNTIME_URL. Идемпотентен: повторный запуск обновит пароль и членство.
 *
 * Пароль берётся из DATABASE_RUNTIME_URL и не логируется.
 */

import 'dotenv/config';
import { Client } from 'pg';

const adminUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const runtimeUrl = process.env.DATABASE_RUNTIME_URL;

if (!adminUrl) {
  console.error('DATABASE_URL (роль-владелец) обязателен.');
  process.exit(1);
}

if (!runtimeUrl) {
  console.error(
    'DATABASE_RUNTIME_URL обязателен: из него берутся имя и пароль runtime-роли.\n' +
      'Пример: postgresql://app_user:strong-password@localhost:5433/mydb',
  );
  process.exit(1);
}

const parsed = new URL(runtimeUrl);
const roleName = decodeURIComponent(parsed.username);
const rolePassword = decodeURIComponent(parsed.password);

if (!roleName || !rolePassword) {
  console.error('DATABASE_RUNTIME_URL должен содержать и пользователя, и пароль.');
  process.exit(1);
}

if (roleName === 'app_runtime') {
  console.error('Имя логин-роли не должно совпадать с групповой ролью app_runtime.');
  process.exit(1);
}

const client = new Client({ connectionString: adminUrl });

async function main() {
  await client.connect();

  // CREATE/ALTER ROLE не принимают параметры (и DO-блок тоже), поэтому имя и
  // пароль экранирует сам Postgres: quote_ident для идентификатора,
  // quote_literal для строки. Конкатенация без экранирования тут была бы
  // SQL-инъекцией через содержимое DATABASE_RUNTIME_URL.
  const {
    rows: [escaped],
  } = await client.query('SELECT quote_ident($1) AS role, quote_literal($2) AS password', [
    roleName,
    rolePassword,
  ]);

  const { rows: existing } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [
    roleName,
  ]);

  if (existing.length === 0) {
    await client.query(`CREATE ROLE ${escaped.role} LOGIN PASSWORD ${escaped.password}`);
    console.log(`✓ роль ${roleName} создана`);
  } else {
    await client.query(`ALTER ROLE ${escaped.role} LOGIN PASSWORD ${escaped.password}`);
    console.log(`✓ роль ${roleName} уже существует — пароль обновлён`);
  }

  // Явно снимаем опасные атрибуты: роль могла существовать с ними ранее.
  await client.query(
    `ALTER ROLE ${escaped.role} NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE`,
  );

  await client.query(`GRANT app_runtime TO ${escaped.role}`);

  console.log(`✓ ${roleName} включена в группу app_runtime (без BYPASSRLS)`);
  console.log('\nДальше: укажите DATABASE_RUNTIME_URL в окружении сервисов.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => client.end());
