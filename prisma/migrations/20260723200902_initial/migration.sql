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
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "sitterProfileId" INTEGER,
    "sitterServiceId" INTEGER,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "ownerNotes" TEXT,
    "sitterNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "pets_ownerId_idx" ON "pets"("ownerId");

-- AddForeignKey
ALTER TABLE "sitter_profiles" ADD CONSTRAINT "sitter_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitter_services" ADD CONSTRAINT "sitter_services_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "sitter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sitterProfileId_fkey" FOREIGN KEY ("sitterProfileId") REFERENCES "sitter_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sitterServiceId_fkey" FOREIGN KEY ("sitterServiceId") REFERENCES "sitter_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
