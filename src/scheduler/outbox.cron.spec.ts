import { OutboxInbox } from '@nestjs/outbox';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { OutboxCron } from './outbox.cron';

describe('OutboxCron', () => {
  let inbox: { prune: jest.Mock };

  beforeEach(() => {
    inbox = { prune: jest.fn().mockResolvedValue(0) };
  });

  it('prunes processed inbox entries', () => {
    new OutboxCron(inbox as unknown as OutboxInbox).prune();

    expect(inbox.prune).toHaveBeenCalledWith('30d');
  });

  it('registers a cron job that stops when the app closes', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [OutboxCron, { provide: OutboxInbox, useValue: inbox }],
    }).compile();
    await moduleRef.init();

    const job = moduleRef
      .get(SchedulerRegistry)
      .getCronJob('outbox_inbox_prune');
    expect(job.isActive).toBe(true);

    await moduleRef.close();
    expect(job.isActive).toBe(false);
  });
});
