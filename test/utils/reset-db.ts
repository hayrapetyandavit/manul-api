import { PrismaService } from 'src/prisma/prisma.service';

export async function resetDb(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "reviews", "bookings", "sitter_services", "sitter_profiles", "pets", "users" RESTART IDENTITY CASCADE',
  );
  await prisma.$executeRawUnsafe(
    'TRUNCATE nest_outbox.messages, nest_outbox.dead_letters, nest_outbox.inbox',
  );
}
