import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { OutboxProcessor } from 'src/outbox/outbox.processor';
import { OutboxCron } from './outbox.cron';

describe('OutboxCron', () => {
  let processor: { process: jest.Mock };

  beforeEach(() => {
    processor = { process: jest.fn().mockResolvedValue(undefined) };
  });

  it('processes pending outbox events on each tick', () => {
    new OutboxCron(processor as unknown as OutboxProcessor).run();

    expect(processor.process).toHaveBeenCalledTimes(1);
  });

  it('purges published outbox events', () => {
    const purging = {
      purgePublished: jest.fn().mockResolvedValue(0),
    };

    new OutboxCron(purging as unknown as OutboxProcessor).purge();

    expect(purging.purgePublished).toHaveBeenCalledTimes(1);
  });

  it('registers a cron job that stops when the app closes', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        OutboxCron,
        { provide: OutboxProcessor, useValue: processor },
      ],
    }).compile();
    await moduleRef.init();

    const job = moduleRef.get(SchedulerRegistry).getCronJob('outbox_drain');
    expect(job.running).toBe(true);

    await moduleRef.close();
    expect(job.running).toBe(false);
  });
});
