import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Сид шаблона. Два режима:
//   npm run db:seed:base — только workspace + owner (нужен на любом окружении)
//   npm run db:seed:dev  — base + демо-данные примера домена (projects/tasks)
//
// Owner берётся из env: SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD.
// Демо-данные из режима `dev` в прод не попадают.

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('POSTGRES_URL or DATABASE_URL is required for seed.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_WORKSPACE_SLUG = 'demo';

async function seedOwner(): Promise<string | null> {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!email || !password) {
    console.warn('⚠ SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD не заданы — owner не создан');
    return null;
  }

  const workspace = await prisma.workspace.upsert({
    where: { slug: DEMO_WORKSPACE_SLUG },
    update: {},
    create: { slug: DEMO_WORKSPACE_SLUG, name: 'Demo Workspace' },
  });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ owner уже существует: ${email}`);
    return workspace.id;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2i });
  await prisma.user.create({
    data: { email, password: passwordHash, name: 'Owner', workspaceId: workspace.id },
  });
  console.log(`✓ owner + workspace: ${email} / ${workspace.slug}`);
  return workspace.id;
}

// Демо-данные эталонного домена. Удаляется вместе с example-service.
async function seedExampleDomain(workspaceId: string) {
  const existing = await prisma.project.findFirst({ where: { workspaceId } });
  if (existing) {
    console.log('✓ демо-проекты уже существуют');
    return;
  }

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: 'Демо-проект',
      description: 'Создан сидом как пример доменной сущности шаблона.',
    },
  });

  await prisma.task.createMany({
    data: [
      { workspaceId, projectId: project.id, title: 'Первая задача', status: 'todo' },
      { workspaceId, projectId: project.id, title: 'Задача в работе', status: 'in_progress' },
      { workspaceId, projectId: project.id, title: 'Завершённая задача', status: 'done' },
    ],
  });

  console.log('✓ демо-данные: 1 проект, 3 задачи');
}

async function main() {
  const mode = process.argv[2] === 'dev' ? 'dev' : 'base';
  const workspaceId = await seedOwner();

  if (mode === 'dev') {
    if (!workspaceId) {
      console.warn('⚠ демо-данные пропущены: нет workspace (задайте SEED_OWNER_*)');
      return;
    }
    await seedExampleDomain(workspaceId);
  }

  console.log(`✓ seed завершён (режим: ${mode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
