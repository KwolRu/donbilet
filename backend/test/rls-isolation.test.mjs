/**
 * Негативный тест tenant-изоляции на уровне БД.
 *
 *   npm run db:runtime-role      # один раз: создать роль приложения
 *   npm run test:rls
 *
 * Проверяет, что роль приложения (без BYPASSRLS) физически не может достать
 * данные чужого workspace — даже запросом без фильтра `workspace_id`, то есть
 * ровно в том случае, когда разработчик забыл фильтр в коде.
 *
 * Тест намеренно ходит в БД напрямую, мимо Prisma и приложения: проверяется
 * последний рубеж защиты, а не поведение ORM.
 *
 * Требует: применённые миграции (`npm run db:migrate:deploy`), DATABASE_URL
 * (владелец) и DATABASE_RUNTIME_URL (роль приложения).
 */

import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const adminUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const runtimeUrl = process.env.DATABASE_RUNTIME_URL;

if (!adminUrl || !runtimeUrl) {
  console.error(
    'Нужны DATABASE_URL и DATABASE_RUNTIME_URL. Создайте роль: npm run db:runtime-role',
  );
  process.exit(1);
}

const admin = new pg.Client({ connectionString: adminUrl });
const runtime = new pg.Client({ connectionString: runtimeUrl });

const workspaceA = { id: randomUUID(), slug: `rls-a-${Date.now()}` };
const workspaceB = { id: randomUUID(), slug: `rls-b-${Date.now()}` };
const projectA = { id: randomUUID(), name: 'Проект тенанта A' };
const projectB = { id: randomUUID(), name: 'Проект тенанта B' };

/** Выполняет запрос от имени приложения в контексте указанного workspace. */
async function asWorkspace(workspaceId, sql, params = []) {
  await runtime.query('BEGIN');
  try {
    await runtime.query("SELECT set_config('app.current_workspace_id', $1, true)", [workspaceId]);
    const result = await runtime.query(sql, params);
    await runtime.query('COMMIT');
    return result;
  } catch (error) {
    await runtime.query('ROLLBACK');
    throw error;
  }
}

/** Выполняет запрос от имени приложения БЕЗ workspace-контекста. */
async function withoutContext(sql, params = []) {
  await runtime.query('BEGIN');
  try {
    const result = await runtime.query(sql, params);
    await runtime.query('COMMIT');
    return result;
  } catch (error) {
    await runtime.query('ROLLBACK');
    throw error;
  }
}

describe('RLS: изоляция workspace', () => {
  before(async () => {
    await admin.connect();
    await runtime.connect();

    for (const ws of [workspaceA, workspaceB]) {
      await admin.query(
        `INSERT INTO workspaces (id, slug, name, created_at, updated_at)
         VALUES ($1, $2, $3, now(), now())`,
        [ws.id, ws.slug, ws.slug],
      );
    }

    await admin.query(
      `INSERT INTO projects (id, workspace_id, name, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', now(), now()), ($4, $5, $6, 'active', now(), now())`,
      [projectA.id, workspaceA.id, projectA.name, projectB.id, workspaceB.id, projectB.name],
    );
  });

  after(async () => {
    // Чистим владельцем: политики к нему не применяются.
    await admin.query('DELETE FROM projects WHERE id = ANY($1)', [[projectA.id, projectB.id]]);
    await admin.query('DELETE FROM workspaces WHERE id = ANY($1)', [[workspaceA.id, workspaceB.id]]);
    await admin.end();
    await runtime.end();
  });

  it('роль приложения не обходит RLS', async () => {
    const { rows } = await runtime.query(
      'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user',
    );
    assert.equal(rows[0].rolbypassrls, false, 'у роли приложения не должно быть BYPASSRLS');
    assert.equal(rows[0].rolsuper, false, 'роль приложения не должна быть суперпользователем');
  });

  it('в контексте A виден только проект A — даже без фильтра в запросе', async () => {
    const { rows } = await asWorkspace(workspaceA.id, 'SELECT id, name FROM projects');

    const ids = rows.map((row) => row.id);
    assert.ok(ids.includes(projectA.id), 'свой проект должен быть виден');
    assert.ok(!ids.includes(projectB.id), 'чужой проект виден быть НЕ должен');
  });

  it('прямое чтение чужой строки по id возвращает пусто', async () => {
    const { rows } = await asWorkspace(workspaceA.id, 'SELECT id FROM projects WHERE id = $1', [
      projectB.id,
    ]);

    assert.equal(rows.length, 0, 'чужая строка не должна доставаться по прямому id');
  });

  it('UPDATE чужой строки не меняет ни одной записи', async () => {
    const { rowCount } = await asWorkspace(
      workspaceA.id,
      'UPDATE projects SET name = $1 WHERE id = $2',
      ['перехвачено', projectB.id],
    );

    assert.equal(rowCount, 0, 'UPDATE чужой строки должен затронуть 0 записей');

    const { rows } = await admin.query('SELECT name FROM projects WHERE id = $1', [projectB.id]);
    assert.equal(rows[0].name, projectB.name, 'данные тенанта B не должны измениться');
  });

  it('DELETE чужой строки не удаляет ни одной записи', async () => {
    const { rowCount } = await asWorkspace(workspaceA.id, 'DELETE FROM projects WHERE id = $1', [
      projectB.id,
    ]);

    assert.equal(rowCount, 0, 'DELETE чужой строки должен затронуть 0 записей');

    const { rows } = await admin.query('SELECT 1 FROM projects WHERE id = $1', [projectB.id]);
    assert.equal(rows.length, 1, 'строка тенанта B должна остаться на месте');
  });

  it('INSERT с чужим workspace_id отклоняется политикой', async () => {
    await assert.rejects(
      () =>
        asWorkspace(
          workspaceA.id,
          `INSERT INTO projects (id, workspace_id, name, status, created_at, updated_at)
           VALUES ($1, $2, 'подделка', 'active', now(), now())`,
          [randomUUID(), workspaceB.id],
        ),
      /row-level security/i,
      'вставка в чужой workspace должна падать на WITH CHECK',
    );
  });

  it('без workspace-контекста не видно ничего (fail-closed)', async () => {
    const { rows } = await withoutContext('SELECT id FROM projects');

    assert.equal(rows.length, 0, 'без контекста запрос обязан возвращать ноль строк');
  });
});
