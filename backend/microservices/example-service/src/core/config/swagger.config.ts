import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Swagger поднимается только в этом сервисе (см. ADR-0001 §6): единственная
// точка, где документируется публичный доменный API. Порт берётся из env, чтобы
// «Try it out» работал и при запуске напрямую, и через gateway.
export const setupSwagger = (app: INestApplication) => {
  const port = Number(process.env.EXAMPLE_SERVICE_PORT || 5001);
  const title = process.env.APP_NAME || '__APP_NAME__';

  const config = new DocumentBuilder()
    .setTitle(`${title} API`)
    .setDescription(`Документация доменного API ${title}`)
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}/api`, 'Прямой порт сервиса')
    .addServer('/api', 'Через gateway')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/docs', app, document, {
    jsonDocumentUrl: '/swagger-json',
    yamlDocumentUrl: '/swagger-yaml',
    customSiteTitle: `${title} API Docs`,
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
};
