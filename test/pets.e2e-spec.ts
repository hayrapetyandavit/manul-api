import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from 'src/prisma/prisma.service';
import { bearer } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { createUser, petBody } from './utils/factories';
import { expectMessage } from './utils/messages';
import { resetDb } from './utils/reset-db';

describe('Pets (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, reads, updates, and deletes a pet for its owner', async () => {
    const owner = await createUser(prisma);
    const auth = bearer(owner);

    const created = await request(app.getHttpServer())
      .post('/pets')
      .set(auth)
      .send(petBody)
      .expect(201);

    expect(created.body.name).toBe('Milo');
    expect(Number(created.body.weightKg)).toBe(12.5);
    expect(created.body.ownerId).toBe(owner.id);

    const found = await request(app.getHttpServer())
      .get(`/pets/${created.body.id}`)
      .set(auth)
      .expect(200);

    expect(found.body.breed).toBe('Mix');
    expect(Number(found.body.weightKg)).toBe(12.5);

    const updated = await request(app.getHttpServer())
      .patch(`/pets/${created.body.id}`)
      .set(auth)
      .send({ name: 'Luna' })
      .expect(200);

    expect(updated.body.name).toBe('Luna');

    await request(app.getHttpServer())
      .delete(`/pets/${created.body.id}`)
      .set(auth)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/pets/${created.body.id}`)
      .set(auth)
      .expect(404);
  });

  it('rejects unknown pet fields', async () => {
    const owner = await createUser(prisma);

    const response = await request(app.getHttpServer())
      .post('/pets')
      .set(bearer(owner))
      .send({ ...petBody, unknown: true })
      .expect(400);

    expectMessage(response.body, 'unknown');
  });

  it('hides a pet from another owner', async () => {
    const owner = await createUser(prisma);
    const stranger = await createUser(prisma);

    const created = await request(app.getHttpServer())
      .post('/pets')
      .set(bearer(owner))
      .send(petBody)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/pets/${created.body.id}`)
      .set(bearer(stranger))
      .expect(404);

    expectMessage(response.body, `Pet #${created.body.id} not found`);

    await request(app.getHttpServer())
      .patch(`/pets/${created.body.id}`)
      .set(bearer(stranger))
      .send({ name: 'Stolen' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/pets/${created.body.id}`)
      .set(bearer(stranger))
      .send()
      .expect(404);
  });
});
