import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from 'src/prisma/prisma.service';
import { bearer } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { createUser, serviceBody } from './utils/factories';
import { expectMessage } from './utils/messages';
import { resetDb } from './utils/reset-db';

describe('Sitters (e2e)', () => {
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

  it('lists other sitters and manages one profile per user', async () => {
    const caller = await createUser(prisma);
    const sitter = await createUser(prisma);
    const ownerOnly = await createUser(prisma);

    await request(app.getHttpServer())
      .post('/sitters/profile')
      .set(bearer(sitter))
      .send({ description: 'Cat specialist', experienceYears: 4 })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/sitters/profile')
      .set(bearer(sitter))
      .send({ description: 'Again' })
      .expect(409);

    expectMessage(duplicate.body, 'already exists');

    const list = await request(app.getHttpServer())
      .get('/sitters')
      .set(bearer(caller))
      .expect(200);

    const ids = list.body.map((user: { id: number }) => user.id);
    expect(ids).toContain(sitter.id);
    expect(ids).not.toContain(caller.id);
    expect(ids).not.toContain(ownerOnly.id);

    const profile = await request(app.getHttpServer())
      .get('/sitters/profile')
      .set(bearer(sitter))
      .expect(200);

    expect(profile.body.description).toBe('Cat specialist');

    const updated = await request(app.getHttpServer())
      .patch('/sitters/profile')
      .set(bearer(sitter))
      .send({ experienceYears: 5 })
      .expect(200);

    expect(updated.body.experienceYears).toBe(5);

    await request(app.getHttpServer())
      .delete('/sitters/profile')
      .set(bearer(sitter))
      .expect(200);

    await request(app.getHttpServer())
      .get('/sitters/profile')
      .set(bearer(sitter))
      .expect(404);
  });

  it('allows one service per type and only the owner can change it', async () => {
    const sitter = await createUser(prisma);
    const stranger = await createUser(prisma);

    await request(app.getHttpServer())
      .post('/sitters/profile')
      .set(bearer(sitter))
      .send({ description: 'Walker' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/sitters/services')
      .set(bearer(sitter))
      .send(serviceBody)
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/sitters/services')
      .set(bearer(sitter))
      .send({ ...serviceBody, price: 40 })
      .expect(409);

    expectMessage(duplicate.body, 'already exists');

    const daycare = await request(app.getHttpServer())
      .post('/sitters/services')
      .set(bearer(sitter))
      .send({ ...serviceBody, type: 'DAYCARE', price: 50 })
      .expect(201);

    expect(daycare.body.type).toBe('DAYCARE');

    const updated = await request(app.getHttpServer())
      .patch(`/sitters/services/${created.body.id}`)
      .set(bearer(sitter))
      .send({ price: 30 })
      .expect(200);

    expect(Number(updated.body.price)).toBe(30);

    await request(app.getHttpServer())
      .patch(`/sitters/services/${created.body.id}`)
      .set(bearer(stranger))
      .send({ price: 1 })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/sitters/services/${created.body.id}`)
      .set(bearer(stranger))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/sitters/services/${created.body.id}`)
      .set(bearer(sitter))
      .expect(200);
  });
});
