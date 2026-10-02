import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';

describe('PrismaClientExceptionFilter', () => {
  const filter = new PrismaClientExceptionFilter();

  function host() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  it('maps a missing record to a generic 404', () => {
    const { host: argumentsHost, status, json } = host();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'secret column detail\n',
      { code: 'P2025', clientVersion: 'test' },
    );

    filter.catch(exception, argumentsHost);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Record not found',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('secret column');
  });

  it('hides an unmapped prisma error behind a generic 500', () => {
    const { host: argumentsHost, status, json } = host();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed on the field: (`petId`)',
      { code: 'P2003', clientVersion: 'test' },
    );

    filter.catch(exception, argumentsHost);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('petId');
  });

  it('maps a unique conflict to a generic 409', () => {
    const { host: argumentsHost, status, json } = host();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      { code: 'P2002', clientVersion: 'test' },
    );

    filter.catch(exception, argumentsHost);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'A record with this value already exists',
    });
  });
});
