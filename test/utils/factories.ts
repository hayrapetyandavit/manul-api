import {
  PetCoat,
  PetGender,
  PetGeneralHealth,
  PetTemperament,
  PetType,
  ServiceType,
} from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

let sequence = 0;

function nextId() {
  sequence += 1;
  return `${Date.now()}-${sequence}`;
}

export const petBody = {
  name: 'Milo',
  type: PetType.DOG,
  breed: 'Mix',
  birthDate: '2020-01-15T00:00:00.000Z',
  coat: PetCoat.SHORT,
  weightKg: 12.5,
  generalHealth: PetGeneralHealth.HEALTHY,
  temperament: PetTemperament.PASSIVE,
  gender: PetGender.MALE,
  neuteredSpayed: true,
};

export const serviceBody = {
  type: ServiceType.WALKING,
  petTypes: [PetType.DOG],
  price: 25,
  durationMin: 30,
  description: 'Neighborhood walks',
};

export async function createUser(prisma: PrismaService) {
  const id = nextId();

  return prisma.user.create({
    data: {
      email: `user-${id}@e2e.test`,
      googleId: `google-${id}`,
      firstName: 'Test',
      lastName: 'User',
    },
  });
}

export async function createPet(
  prisma: PrismaService,
  ownerId: number,
  type: PetType = PetType.DOG,
) {
  return prisma.pet.create({
    data: {
      ownerId,
      name: 'Milo',
      type,
      breed: 'Mix',
      birthDate: new Date('2020-01-15'),
      coat: PetCoat.SHORT,
      weightKg: 12.5,
      generalHealth: PetGeneralHealth.HEALTHY,
      temperament: PetTemperament.PASSIVE,
      gender: PetGender.MALE,
      neuteredSpayed: true,
    },
  });
}

export async function createSitter(
  prisma: PrismaService,
  userId: number,
  type: ServiceType = ServiceType.WALKING,
  petTypes: PetType[] = [PetType.DOG],
) {
  const profile = await prisma.sitterProfile.create({
    data: {
      userId,
      description: 'Experienced sitter',
      experienceYears: 3,
    },
  });

  const service = await prisma.sitterService.create({
    data: {
      sitterProfileId: profile.id,
      type,
      petTypes,
      price: 25,
      durationMin: 30,
    },
  });

  return { profile, service };
}
