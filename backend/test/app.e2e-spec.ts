import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ExampleAppModule } from '../microservices/example-service/src/app.module';

/**
 * Каркас e2e-теста сервиса. Запуск: `npm run test:e2e`.
 *
 * Требует поднятых Postgres и Redis — `ExampleAppModule` подключается к ним на
 * старте и падает, если они недоступны (health-gate в main.ts). Для CI
 * поднимайте инфраструктуру из `backend/infra/docker-compose.shared.yml`.
 */
describe('Example service (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ExampleAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health отвечает статусом сервиса', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        if (!res.body?.status) {
          throw new Error('health-ответ без поля status');
        }
      });
  });

  it('GET /api/projects без токена возвращает 401', () => {
    return request(app.getHttpServer()).get('/api/projects').expect(401);
  });
});
