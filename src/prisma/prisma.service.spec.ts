import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    jest.restoreAllMocks();
  });

  it('connects on startup and closes the client and pool on shutdown', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/manul_test';
    jest
      .spyOn(PrismaService.prototype, '$connect')
      .mockResolvedValue(undefined);
    jest
      .spyOn(PrismaService.prototype, '$disconnect')
      .mockResolvedValue(undefined);

    const service = new PrismaService();
    const end = jest.fn().mockResolvedValue(undefined);
    (service as unknown as { pool: { end: typeof end } }).pool.end = end;

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(PrismaService.prototype.$connect).toHaveBeenCalledTimes(1);
    expect(PrismaService.prototype.$disconnect).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });
});
