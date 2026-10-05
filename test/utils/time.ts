import { DateTime } from 'luxon';

export function futureRange(daysAhead = 2, hours = 2) {
  const start = DateTime.now().plus({ days: daysAhead }).startOf('hour');
  const end = start.plus({ hours });
  const startTime = start.toISO();
  const endTime = end.toISO();

  if (!startTime || !endTime) {
    throw new Error('Failed to build booking timestamps');
  }

  return { startTime, endTime };
}
