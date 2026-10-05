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
import { futureRange } from './utils/time';

describe('Bookings (e2e)', () => {
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

  async function bookingScene() {
    const owner = await createUser(prisma);
    const sitterUser = await createUser(prisma);
    const stranger = await createUser(prisma);
    const pet = await createPet(prisma, owner.id);
    const { profile, service } = await createSitter(prisma, sitterUser.id);

    return { owner, sitterUser, stranger, pet, profile, service };
  }

  function bookingBody(
    petId: number,
    profileId?: number,
    serviceId?: number,
    range = futureRange(),
  ) {
    return {
      petId,
      sitterProfileId: profileId,
      sitterServiceId: serviceId,
      ...range,
      ownerNotes: 'Needs a slow walk',
    };
  }

  it('creates an open request or a request for one sitter', async () => {
    const { owner, pet, profile, service } = await bookingScene();
    const auth = bearer(owner);

    const open = await request(app.getHttpServer())
      .post('/bookings')
      .set(auth)
      .send({
        petId: pet.id,
        ...futureRange(),
      })
      .expect(201);

    expect(open.body.sitterProfileId).toBeNull();
    expect(open.body.sitterServiceId).toBeNull();
    expect(open.body.status).toBe('PENDING');
    expect(Number(open.body.price)).toBe(0);

    const aimed = await request(app.getHttpServer())
      .post('/bookings')
      .set(auth)
      .send(bookingBody(pet.id, profile.id, service.id, futureRange(4)))
      .expect(201);

    expect(aimed.body.sitterProfileId).toBe(profile.id);
    expect(Number(aimed.body.price)).toBe(25);
  });

  it('requires both sitter ids or neither', async () => {
    const { owner, pet, profile } = await bookingScene();

    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send({
        petId: pet.id,
        sitterProfileId: profile.id,
        ...futureRange(),
      })
      .expect(400);

    expectMessage(response.body, 'both sitterProfileId and sitterServiceId');
  });

  it('rejects start times outside the allowed window and stays over seven days', async () => {
    const { owner, pet, profile, service } = await bookingScene();
    const auth = bearer(owner);
    const past = DateTime.now().minus({ days: 1 });
    const pastEnd = past.plus({ hours: 2 });
    const tooFar = DateTime.now().plus({ months: 7 });
    const longStart = DateTime.now().plus({ days: 2 });
    const longEnd = longStart.plus({ days: 8 });

    const pastResponse = await request(app.getHttpServer())
      .post('/bookings')
      .set(auth)
      .send({
        petId: pet.id,
        sitterProfileId: profile.id,
        sitterServiceId: service.id,
        startTime: past.toISO(),
        endTime: pastEnd.toISO(),
      })
      .expect(400);

    expectMessage(pastResponse.body, 'startTime must be within date range');

    const farResponse = await request(app.getHttpServer())
      .post('/bookings')
      .set(auth)
      .send({
        petId: pet.id,
        sitterProfileId: profile.id,
        sitterServiceId: service.id,
        startTime: tooFar.toISO(),
        endTime: tooFar.plus({ hours: 2 }).toISO(),
      })
      .expect(400);

    expectMessage(farResponse.body, 'startTime must be within date range');

    const longResponse = await request(app.getHttpServer())
      .post('/bookings')
      .set(auth)
      .send({
        petId: pet.id,
        sitterProfileId: profile.id,
        sitterServiceId: service.id,
        startTime: longStart.toISO(),
        endTime: longEnd.toISO(),
      })
      .expect(400);

    expectMessage(longResponse.body, 'endTime must be within date range');
  });

  it('rejects an overlapping booking for the same sitter', async () => {
    const { owner, pet, profile, service } = await bookingScene();
    const body = bookingBody(pet.id, profile.id, service.id);

    await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(body)
      .expect(201);

    const overlap = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(body)
      .expect(409);

    expectMessage(overlap.body, 'Sitter already has a booking');
  });

  it('returns a booking only to its owner and sitter', async () => {
    const { owner, sitterUser, stranger, pet, profile, service } =
      await bookingScene();

    const created = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(bookingBody(pet.id, profile.id, service.id))
      .expect(201);

    const ownerList = await request(app.getHttpServer())
      .get('/bookings')
      .set(bearer(owner))
      .expect(200);
    const sitterList = await request(app.getHttpServer())
      .get('/bookings')
      .set(bearer(sitterUser))
      .expect(200);
    const strangerList = await request(app.getHttpServer())
      .get('/bookings')
      .set(bearer(stranger))
      .expect(200);

    expect(ownerList.body.map((booking: { id: number }) => booking.id)).toEqual(
      [created.body.id],
    );
    expect(
      sitterList.body.map((booking: { id: number }) => booking.id),
    ).toEqual([created.body.id]);
    expect(strangerList.body).toEqual([]);

    await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(stranger))
      .send({ status: 'CANCELLED' })
      .expect(404);
  });

  it('follows the allowed status transitions and blocks the others', async () => {
    const { owner, sitterUser, pet, profile, service } = await bookingScene();

    const created = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(bookingBody(pet.id, profile.id, service.id))
      .expect(201);

    const ownerAccept = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(owner))
      .send({ status: 'ACCEPTED' })
      .expect(400);

    expectMessage(
      ownerAccept.body,
      'Cannot transition booking from PENDING to ACCEPTED',
    );

    const declined = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'DECLINED' })
      .expect(200);

    expect(declined.body.status).toBe('DECLINED');

    const afterTerminal = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'ACCEPTED' })
      .expect(400);

    expectMessage(
      afterTerminal.body,
      'Cannot transition booking from DECLINED to ACCEPTED',
    );
  });

  it('lets the owner cancel and the sitter accept, cancel, or complete', async () => {
    const { owner, sitterUser, pet, profile, service } = await bookingScene();

    const pending = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(bookingBody(pet.id, profile.id, service.id))
      .expect(201);

    const cancelled = await request(app.getHttpServer())
      .patch(`/bookings/${pending.body.id}`)
      .set(bearer(owner))
      .send({ status: 'CANCELLED' })
      .expect(200);

    expect(cancelled.body.status).toBe('CANCELLED');

    const acceptedBooking = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(bookingBody(pet.id, profile.id, service.id, futureRange(5)))
      .expect(201);

    const accepted = await request(app.getHttpServer())
      .patch(`/bookings/${acceptedBooking.body.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'ACCEPTED' })
      .expect(200);

    expect(accepted.body.status).toBe('ACCEPTED');

    const tooEarly = await request(app.getHttpServer())
      .patch(`/bookings/${acceptedBooking.body.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'COMPLETED' })
      .expect(400);

    expectMessage(tooEarly.body, 'only after it ends');

    const sitterCancelled = await request(app.getHttpServer())
      .patch(`/bookings/${acceptedBooking.body.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'CANCELLED' })
      .expect(200);

    expect(sitterCancelled.body.status).toBe('CANCELLED');
  });

  it('completes an accepted booking only after it ends', async () => {
    const { owner, sitterUser, pet, profile, service } = await bookingScene();
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
        status: BookingStatus.ACCEPTED,
      },
    });

    const ownerComplete = await request(app.getHttpServer())
      .patch(`/bookings/${booking.id}`)
      .set(bearer(owner))
      .send({ status: 'COMPLETED' })
      .expect(400);

    expectMessage(
      ownerComplete.body,
      'Cannot transition booking from ACCEPTED to COMPLETED',
    );

    const completed = await request(app.getHttpServer())
      .patch(`/bookings/${booking.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'COMPLETED' })
      .expect(200);

    expect(completed.body.status).toBe('COMPLETED');
  });

  it('limits note changes to the party and status that may edit them', async () => {
    const { owner, sitterUser, pet, profile, service } = await bookingScene();

    const created = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(bookingBody(pet.id, profile.id, service.id))
      .expect(201);

    const ownerNotes = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(owner))
      .send({ ownerNotes: 'Gate code 1234' })
      .expect(200);

    expect(ownerNotes.body.ownerNotes).toBe('Gate code 1234');

    const sitterEditsOwnerNotes = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(sitterUser))
      .send({ ownerNotes: 'changed' })
      .expect(400);

    expectMessage(sitterEditsOwnerNotes.body, 'Notes cannot be changed');

    const sitterNotes = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(sitterUser))
      .send({ sitterNotes: 'I can do that time' })
      .expect(200);

    expect(sitterNotes.body.sitterNotes).toBe('I can do that time');

    await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(sitterUser))
      .send({ status: 'ACCEPTED' })
      .expect(200);

    const ownerNotesAfterAccept = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(owner))
      .send({ ownerNotes: 'too late' })
      .expect(400);

    expectMessage(ownerNotesAfterAccept.body, 'Notes cannot be changed');

    const sitterNotesAfterAccept = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(sitterUser))
      .send({ sitterNotes: 'On my way' })
      .expect(200);

    expect(sitterNotesAfterAccept.body.sitterNotes).toBe('On my way');
  });

  it('rejects an empty update and fields outside the update contract', async () => {
    const { owner, pet, profile, service } = await bookingScene();

    const created = await request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(owner))
      .send(bookingBody(pet.id, profile.id, service.id))
      .expect(201);

    const empty = await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(owner))
      .send({})
      .expect(400);

    expectMessage(empty.body, 'No booking changes were provided');

    await request(app.getHttpServer())
      .patch(`/bookings/${created.body.id}`)
      .set(bearer(owner))
      .send({ price: 1 })
      .expect(400);
  });
});
