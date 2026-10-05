import { validateSync } from 'class-validator';
import { DateTime } from 'luxon';
import { CreateBookingDto } from './create-booking.dto';

function booking(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  const start = DateTime.now().plus({ days: 2 }).toUTC();
  return Object.assign(new CreateBookingDto(), {
    petId: 10,
    sitterProfileId: 20,
    sitterServiceId: 30,
    startTime: start.toISO(),
    endTime: start.plus({ hours: 2 }).toISO(),
    ...overrides,
  });
}

function messages(dto: CreateBookingDto): string[] {
  return validateSync(dto).flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...(error.children ?? []).flatMap((child) =>
      Object.values(child.constraints ?? {}),
    ),
  ]);
}

describe('CreateBookingDto', () => {
  it('accepts a sitter booking inside the allowed window', () => {
    expect(messages(booking())).toEqual([]);
  });

  it('accepts a request that names no sitter', () => {
    expect(
      messages(
        booking({ sitterProfileId: undefined, sitterServiceId: undefined }),
      ),
    ).toEqual([]);
  });

  it('rejects a sitter profile without a service, and the reverse', () => {
    expect(
      messages(booking({ sitterServiceId: undefined })).join(' '),
    ).toContain(
      'Provide both sitterProfileId and sitterServiceId, or neither.',
    );
    expect(
      messages(booking({ sitterProfileId: undefined })).join(' '),
    ).toContain(
      'Provide both sitterProfileId and sitterServiceId, or neither.',
    );
  });

  it('rejects a start in the past and an end outside a week of the start', () => {
    const start = DateTime.now().minus({ hours: 1 }).toUTC();
    expect(
      messages(
        booking({
          startTime: start.toISO()!,
          endTime: start.plus({ hours: 1 }).toISO()!,
        }),
      ).join(' '),
    ).toContain('startTime must be within date range');

    const future = DateTime.now().plus({ days: 2 }).toUTC();
    expect(
      messages(
        booking({
          startTime: future.toISO()!,
          endTime: future.minus({ hours: 1 }).toISO()!,
        }),
      ).join(' '),
    ).toContain('endTime must be within date range');

    expect(
      messages(
        booking({
          startTime: future.toISO()!,
          endTime: future.plus({ days: 8 }).toISO()!,
        }),
      ).join(' '),
    ).toContain('endTime must be within date range');
  });
});
