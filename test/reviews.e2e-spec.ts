import { INestApplication } from '@nestjs/common';
import { DateTime } from 'luxon';
import * as request from 'supertest';
import { BookingStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { bearer } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { createPet, createSitter, createUser } from './utils/factories';
import { expectMessage } from './utils/messages';
import { resetDb } from './utils/reset-db';

describe('Reviews (e2e)', () => {
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

  async function completedBooking() {
    const owner = await createUser(prisma);
    const sitterUser = await createUser(prisma);
    const stranger = await createUser(prisma);
    const pet = await createPet(prisma, owner.id);
    const { profile, service } = await createSitter(prisma, sitterUser.id);
    const end = DateTime.now().minus({ hours: 1 });

    const booking = await prisma.booking.create({
      data: {
        ownerId: owner.id,
        petId: pet.id,
        sitterProfileId: profile.id,
        sitterServiceId: service.id,
        price: 25,
        startTime: end.minus({ hours: 2 }).toJSDate(),
        endTime: end.toJSDate(),
        status: BookingStatus.COMPLETED,
      },
    });

    return { owner, sitterUser, stranger, booking };
  }

  it('lets the owner and the sitter review a completed booking once', async () => {
    const { owner, sitterUser, stranger, booking } = await completedBooking();

    const ownerReview = await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(owner))
      .send({ bookingId: booking.id, rating: 5, comment: 'Great walk' })
      .expect(201);

    expect(ownerReview.body.rating).toBe(5);
    expect(ownerReview.body.reviewerId).toBeUndefined();

    const duplicate = await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(owner))
      .send({ bookingId: booking.id, rating: 4 })
      .expect(409);

    expectMessage(duplicate.body, 'already exists');

    await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(sitterUser))
      .send({ bookingId: booking.id, rating: 4 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(stranger))
      .send({ bookingId: booking.id, rating: 3 })
      .expect(404);

    const aboutSitter = await request(app.getHttpServer())
      .get(`/reviews/user/${sitterUser.id}`)
      .set(bearer(owner))
      .expect(200);

    expect(aboutSitter.body.reviewCount).toBe(1);
    expect(aboutSitter.body.averageRating).toBe(5);
    expect(aboutSitter.body.reviews).toHaveLength(1);
    expect(aboutSitter.body.reviews[0].comment).toBe('Great walk');

    const aboutOwner = await request(app.getHttpServer())
      .get(`/reviews/user/${owner.id}`)
      .set(bearer(sitterUser))
      .expect(200);

    expect(aboutOwner.body.reviewCount).toBe(1);
    expect(aboutOwner.body.averageRating).toBe(4);
  });

  it('rejects reviews of bookings that are not completed', async () => {
    const owner = await createUser(prisma);
    const sitterUser = await createUser(prisma);
    const pet = await createPet(prisma, owner.id);
    const { profile, service } = await createSitter(prisma, sitterUser.id);
    const end = DateTime.now().minus({ hours: 1 });

    const booking = await prisma.booking.create({
      data: {
        ownerId: owner.id,
        petId: pet.id,
        sitterProfileId: profile.id,
        sitterServiceId: service.id,
        price: 25,
        startTime: end.minus({ hours: 2 }).toJSDate(),
        endTime: end.toJSDate(),
        status: BookingStatus.PENDING,
      },
    });

    await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(owner))
      .send({ bookingId: booking.id, rating: 5 })
      .expect(404);
  });

  it('rejects a review from someone who is both owner and sitter', async () => {
    const user = await createUser(prisma);
    const pet = await createPet(prisma, user.id);
    const { profile, service } = await createSitter(prisma, user.id);
    const end = DateTime.now().minus({ hours: 1 });

    const booking = await prisma.booking.create({
      data: {
        ownerId: user.id,
        petId: pet.id,
        sitterProfileId: profile.id,
        sitterServiceId: service.id,
        price: 25,
        startTime: end.minus({ hours: 2 }).toJSDate(),
        endTime: end.toJSDate(),
        status: BookingStatus.COMPLETED,
      },
    });

    await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(user))
      .send({ bookingId: booking.id, rating: 5 })
      .expect(404);
  });

  it('rejects a rating outside 1 to 5', async () => {
    const user = await createUser(prisma);

    await request(app.getHttpServer())
      .post('/reviews')
      .set(bearer(user))
      .send({ bookingId: 1, rating: 6 })
      .expect(400);
  });

  it('returns an empty summary when a user has no reviews', async () => {
    const user = await createUser(prisma);

    const response = await request(app.getHttpServer())
      .get(`/reviews/user/${user.id}`)
      .set(bearer(user))
      .expect(200);

    expect(response.body).toEqual({
      reviews: [],
      averageRating: null,
      reviewCount: 0,
    });
  });
});
