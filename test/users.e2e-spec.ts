import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from 'src/prisma/prisma.service';
import { bearer } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { createUser } from './utils/factories';
import { resetDb } from './utils/reset-db';

describe('Users (e2e)', () => {
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

  it('returns and updates the current profile', async () => {
    const user = await createUser(prisma);

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set(bearer(user))
      .expect(200);

    expect(me.body.email).toBe(user.email);
    expect(me.body.pets).toEqual([]);

    const updated = await request(app.getHttpServer())
      .patch('/users/me')
      .set(bearer(user))
      .send({ firstName: 'Ada', lastName: 'Lovelace' })
      .expect(200);

    expect(updated.body.firstName).toBe('Ada');
    expect(updated.body.lastName).toBe('Lovelace');
  });

  it('rejects unknown profile fields', async () => {
    const user = await createUser(prisma);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set(bearer(user))
      .send({ firstName: 'Ada', email: 'other@e2e.test' })
      .expect(400);
  });

  it('soft-deletes the current user', async () => {
    const user = await createUser(prisma);
    const auth = bearer(user);

    await request(app.getHttpServer())
      .delete('/users/me')
      .set(auth)
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set(auth)
      .expect(200);

    expect(me.body).toEqual({});

    await request(app.getHttpServer())
      .get(`/users/${user.id}`)
      .set(auth)
      .expect(404);
  });

  it('returns a public profile without email or pets', async () => {
    const viewer = await createUser(prisma);
    const subject = await createUser(prisma);

    const response = await request(app.getHttpServer())
      .get(`/users/${subject.id}`)
      .set(bearer(viewer))
      .expect(200);

    expect(response.body.id).toBe(subject.id);
    expect(response.body.firstName).toBe('Test');
    expect(response.body.email).toBeUndefined();
    expect(response.body.pets).toBeUndefined();
    expect(response.body.googleId).toBeUndefined();
  });
});
