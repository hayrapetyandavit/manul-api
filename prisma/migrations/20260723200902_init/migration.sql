-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('WALKING', 'DAYCARE', 'HOME_VISIT', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "PetType" AS ENUM ('DOG', 'CAT', 'BIRD', 'OTHER');

-- CreateEnum
CREATE TYPE "PetCoat" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- CreateEnum
CREATE TYPE "PetGeneralHealth" AS ENUM ('HEALTHY', 'NORMAL', 'NEEDS_ADDITIONAL_CARE');

-- CreateEnum
CREATE TYPE "PetTemperament" AS ENUM ('PASSIVE', 'ENERGETIC', 'ASSERTIVE', 'PASSIVE_AGGRESSIVE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "PetGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "DateOverrideType" AS ENUM ('BLOCK', 'OPEN');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "picture" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitter_profiles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "description" TEXT,
    "experienceYears" INTEGER,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sitter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitter_services" (
    "id" SERIAL NOT NULL,
    "sitterProfileId" INTEGER NOT NULL,
    "type" "ServiceType" NOT NULL,
    "petTypes" "PetType"[],
    "price" DECIMAL(10,2) NOT NULL,
    "durationMin" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sitter_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_availability" (
    "id" SERIAL NOT NULL,
    "sitterProfileId" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_overrides" (
    "id" SERIAL NOT NULL,
    "sitterProfileId" INTEGER NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "type" "DateOverrideType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PetType" NOT NULL,
    "breed" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "coat" "PetCoat" NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "generalHealth" "PetGeneralHealth" NOT NULL,
    "temperament" "PetTemperament" NOT NULL,
    "gender" "PetGender" NOT NULL,
    "neuteredSpayed" BOOLEAN NOT NULL,
    "description" TEXT,
    "vetName" TEXT,
    "vetPhone" TEXT,
    "vetAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "sitterProfileId" INTEGER,
    "sitterServiceId" INTEGER,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "ownerNotes" TEXT,
    "sitterNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "sitter_profiles_userId_key" ON "sitter_profiles"("userId");

-- CreateIndex
CREATE INDEX "sitter_services_sitterProfileId_idx" ON "sitter_services"("sitterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "sitter_services_sitterProfileId_type_key" ON "sitter_services"("sitterProfileId", "type");

-- CreateIndex
CREATE INDEX "weekly_availability_sitterProfileId_weekday_idx" ON "weekly_availability"("sitterProfileId", "weekday");

-- CreateIndex
CREATE INDEX "availability_overrides_sitterProfileId_endTime_idx" ON "availability_overrides"("sitterProfileId", "endTime");

-- CreateIndex
CREATE INDEX "pets_ownerId_idx" ON "pets"("ownerId");

-- CreateIndex
CREATE INDEX "bookings_ownerId_idx" ON "bookings"("ownerId");

-- CreateIndex
CREATE INDEX "bookings_sitterProfileId_idx" ON "bookings"("sitterProfileId");

-- CreateIndex
CREATE INDEX "bookings_petId_idx" ON "bookings"("petId");

-- CreateIndex
CREATE INDEX "bookings_sitterServiceId_idx" ON "bookings"("sitterServiceId");

-- CreateIndex
CREATE INDEX "bookings_ownerId_createdAt_idx" ON "bookings"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "bookings_sitterProfileId_status_idx" ON "bookings"("sitterProfileId", "status");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_reviewerId_key" ON "reviews"("bookingId", "reviewerId");

-- AddForeignKey
ALTER TABLE "sitter_profiles" ADD CONSTRAINT "sitter_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitter_services" ADD CONSTRAINT "sitter_services_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "sitter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_availability" ADD CONSTRAINT "weekly_availability_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "sitter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "sitter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "sitter_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sitterServiceId_fkey" FOREIGN KEY ("sitterServiceId") REFERENCES "sitter_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "weekly_availability"
  ADD CONSTRAINT "weekly_availability_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
  ADD CONSTRAINT "weekly_availability_minutes_check"
    CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");

-- ExclusionConstraints (not expressible in schema.prisma)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Half-open ranges: 09:00-12:00 and 12:00-15:00 may coexist, 09:00-12:00 and 11:00-14:00 may not.
ALTER TABLE "weekly_availability"
  ADD CONSTRAINT "weekly_availability_no_overlap"
  EXCLUDE USING gist (
    "sitterProfileId" WITH =,
    "weekday" WITH =,
    int4range("startMinute", "endMinute") WITH &&
  );

ALTER TABLE "availability_overrides"
  ADD CONSTRAINT "availability_overrides_range_check" CHECK ("endTime" > "startTime");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_range_check" CHECK ("endTime" > "startTime");

-- @nestjs/outbox: PostgresOutboxStore's schema "nest_outbox", version 1.
-- Not modelled in schema.prisma; the library tracks its own version in "nest_outbox".migrations.

CREATE SCHEMA IF NOT EXISTS "nest_outbox";

CREATE TABLE IF NOT EXISTS "nest_outbox".migrations (
  version integer PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "nest_outbox".messages (
  seq bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  id text NOT NULL UNIQUE,
  topic text NOT NULL,
  payload jsonb,
  headers jsonb NOT NULL,
  key text,
  created_at bigint NOT NULL,
  available_at bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  history jsonb NOT NULL DEFAULT '[]',
  lease_owner text,
  lease_until bigint
);

CREATE TABLE "nest_outbox".dead_letters (
  id text PRIMARY KEY,
  seq bigint NOT NULL,
  topic text NOT NULL,
  payload jsonb,
  headers jsonb NOT NULL,
  key text,
  created_at bigint NOT NULL,
  attempts integer NOT NULL,
  last_error text,
  history jsonb NOT NULL,
  reason text NOT NULL,
  failed_at bigint NOT NULL
);

CREATE TABLE "nest_outbox".inbox (
  consumer text NOT NULL,
  message_id text NOT NULL,
  processed_at bigint NOT NULL,
  PRIMARY KEY (consumer, message_id)
);

CREATE INDEX messages_key_seq ON "nest_outbox".messages (key, seq) WHERE key IS NOT NULL;

CREATE INDEX dead_letters_topic_failed_at ON "nest_outbox".dead_letters (topic, failed_at);

CREATE INDEX inbox_processed_at ON "nest_outbox".inbox (processed_at);

INSERT INTO "nest_outbox".migrations (version, name) VALUES (1, 'initial');
