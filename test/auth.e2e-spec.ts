import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from 'src/prisma/prisma.service';
import { bearer } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { createUser } from './utils/factories';
import { resetDb } from './utils/reset-db';

describe('Auth (e2e)', () => {
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

  it('GET /auth/google redirects to Google', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/google')
      .expect(302);

    expect(response.headers.location).toContain('accounts.google.com');
  });

  it('rejects a missing token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('rejects a malformed token', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set({ Authorization: 'Bearer not-a-jwt' })
      .expect(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const user = await createUser(prisma);

    await request(app.getHttpServer())
      .get('/users/me')
      .set(bearer(user, 'wrong-secret'))
      .expect(401);
  });

  it('accepts a token signed with the application secret', async () => {
    const user = await createUser(prisma);

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set(bearer(user))
      .expect(200);

    expect(response.body.email).toBe(user.email);
  });
});
