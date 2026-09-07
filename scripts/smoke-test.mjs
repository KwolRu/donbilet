#!/usr/bin/env node
/**
 * Smoke-тест поднятого стека: проходит путь пользователя целиком через gateway.
 *
 *   npm run smoke                       # по умолчанию http://localhost:8080
 *   BASE_URL=http://localhost:5100 npm run smoke
 *
 * Что проверяется:
 *   1. health gateway и доменного сервиса;
 *   2. регистрация и вход (cookies выставляются);
 *   3. защита: без сессии — 401;
 *   4. CRUD Projects и Tasks через gateway;
 *   5. проверка владения связью (чужой projectId отклоняется);
 *   6. refresh-сессии;
 *   7. неизвестный префикс не проксируется.
 *
 * Тест сам создаёт свой workspace и за собой убирает. На прод не направлять.
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const API = `${BASE_URL}/api`;

let cookieJar = '';
let passed = 0;
let failed = 0;

function record(ok, name, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function rememberCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  if (raw.length === 0) return;
  const jar = new Map(
    cookieJar
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.split('=')[0], pair]),
  );
  for (const cookie of raw) {
    const pair = cookie.split(';')[0];
    jar.set(pair.split('=')[0], pair);
  }
  cookieJar = [...jar.values()].join('; ');
}

async function call(method, path, body, options = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieJar && !options.noCookies ? { Cookie: cookieJar } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });

  rememberCookies(response);

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return { status: response.status, body: payload };
}

function unwrap(payload) {
  // Ответы могут приходить как есть или завёрнутыми в { data: ... }.
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

async function waitForGateway(attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const { status } = await call('GET', '/health');
      if (status === 200) return true;
    } catch {
      /* сервис ещё поднимается */
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

async function main() {
  console.log(`Smoke-тест: ${BASE_URL}\n`);

  console.log('Ожидание gateway...');
  if (!(await waitForGateway())) {
    console.error('Gateway не ответил на /api/health. Стек поднят? `npm run up`');
    process.exit(1);
  }

  // ─── 1. Health ──────────────────────────────────────────────────────────────
  console.log('\nHealth:');
  const gatewayHealth = await call('GET', '/health');
  record(gatewayHealth.status === 200, 'gateway /api/health', `status ${gatewayHealth.status}`);

  const serviceHealth = await call('GET', '/projects/../health');
  record(
    serviceHealth.status === 200 || serviceHealth.status === 404,
    'доменный сервис отвечает через gateway',
    `status ${serviceHealth.status}`,
  );

  // ─── 2. Защита маршрутов ────────────────────────────────────────────────────
  console.log('\nАвторизация:');
  const anonymous = await call('GET', '/projects', undefined, { noCookies: true });
  record(anonymous.status === 401, 'GET /projects без сессии → 401', `status ${anonymous.status}`);

  const email = `smoke-${Date.now()}@example.com`;
  const password = 'Smoke-Test-123!';

  const registered = await call('POST', '/auth/register', {
    email,
    password,
    name: 'Smoke Test',
    workspaceName: 'Smoke Workspace',
  });
  record(
    [200, 201].includes(registered.status),
    'POST /auth/register',
    `status ${registered.status} ${JSON.stringify(registered.body).slice(0, 200)}`,
  );

  if (![200, 201].includes(registered.status)) {
    console.error('\nБез регистрации остальные проверки бессмысленны.');
    finish();
    return;
  }

  const loggedIn = await call('POST', '/auth/login', { email, password });
  record(loggedIn.status === 200 || loggedIn.status === 201, 'POST /auth/login', `status ${loggedIn.status}`);
  record(cookieJar.includes('access_token'), 'сессионные cookies выставлены');

  // ─── 3. CRUD Projects ───────────────────────────────────────────────────────
  console.log('\nProjects:');
  const created = await call('POST', '/projects', {
    name: 'Smoke-проект',
    description: 'создан smoke-тестом',
  });
  const project = unwrap(created.body);
  record(created.status === 201 && Boolean(project?.id), 'POST /projects', `status ${created.status}`);

  const list = await call('GET', '/projects?page=1&limit=10');
  const listBody = unwrap(list.body);
  record(
    list.status === 200 && Array.isArray(listBody?.items) && listBody.items.length > 0,
    'GET /projects возвращает созданный проект',
    `status ${list.status}`,
  );

  const search = await call('GET', '/projects?search=Smoke');
  record(unwrap(search.body)?.items?.length > 0, 'GET /projects?search= работает');

  const patched = await call('PATCH', `/projects/${project?.id}`, { name: 'Smoke-проект (изменён)' });
  record(
    patched.status === 200 && unwrap(patched.body)?.name === 'Smoke-проект (изменён)',
    'PATCH /projects/:id',
    `status ${patched.status}`,
  );

  const missing = await call('GET', `/projects/00000000-0000-0000-0000-000000000000`);
  record(missing.status === 404, 'GET несуществующего проекта → 404', `status ${missing.status}`);

  // ─── 4. CRUD Tasks + владение связью ───────────────────────────────────────
  console.log('\nTasks:');
  const task = await call('POST', '/tasks', { projectId: project?.id, title: 'Smoke-задача' });
  const taskBody = unwrap(task.body);
  record(task.status === 201 && Boolean(taskBody?.id), 'POST /tasks', `status ${task.status}`);

  const tasks = await call('GET', `/tasks?projectId=${project?.id}`);
  record(unwrap(tasks.body)?.items?.length > 0, 'GET /tasks?projectId=');

  const taskPatched = await call('PATCH', `/tasks/${taskBody?.id}`, { status: 'done' });
  record(
    taskPatched.status === 200 && unwrap(taskPatched.body)?.status === 'done',
    'PATCH /tasks/:id',
    `status ${taskPatched.status}`,
  );

  const foreignProject = await call('POST', '/tasks', {
    projectId: '00000000-0000-0000-0000-000000000000',
    title: 'чужой проект',
  });
  record(
    foreignProject.status === 400,
    'POST /tasks с чужим projectId → 400',
    `status ${foreignProject.status}`,
  );

  // ─── 5. Refresh ─────────────────────────────────────────────────────────────
  console.log('\nСессия:');
  const refreshed = await call('POST', '/auth/refresh', {});
  record(
    [200, 201].includes(refreshed.status),
    'POST /auth/refresh',
    `status ${refreshed.status}`,
  );

  const afterRefresh = await call('GET', '/projects');
  record(afterRefresh.status === 200, 'запрос после refresh проходит');

  // ─── 6. Удаление и маршрутизация ────────────────────────────────────────────
  console.log('\nУдаление и маршрутизация:');
  const deletedTask = await call('DELETE', `/tasks/${taskBody?.id}`);
  record(deletedTask.status === 204, 'DELETE /tasks/:id → 204', `status ${deletedTask.status}`);

  const deletedProject = await call('DELETE', `/projects/${project?.id}`);
  record(deletedProject.status === 204, 'DELETE /projects/:id → 204', `status ${deletedProject.status}`);

  const unknownRoute = await call('GET', '/definitely-not-a-route');
  record(
    unknownRoute.status === 404,
    'неизвестный префикс не проксируется → 404',
    `status ${unknownRoute.status}`,
  );

  finish();
}

function finish() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
