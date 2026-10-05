import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { configureApp } from './app.setup';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';

describe('configureApp', () => {
  function createApp(allowedOrigins?: string) {
    const httpAdapter = { name: 'adapter' };
    const app = {
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      get: jest.fn((token: unknown) => {
        if (token === ConfigService) {
          return { get: () => allowedOrigins };
        }

        if (token === HttpAdapterHost) {
          return { httpAdapter };
        }

        throw new Error(`Unexpected token ${String(token)}`);
      }),
    };

    return { app, httpAdapter };
  }

  it('installs helmet, validation, the Prisma filter, and CORS', () => {
    const { app } = createApp('http://localhost:5173,http://localhost:3000');

    configureApp(app as never);

    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes.mock.calls[0][0]).toBeInstanceOf(ValidationPipe);
    expect(app.useGlobalFilters.mock.calls[0][0]).toBeInstanceOf(
      PrismaClientExceptionFilter,
    );
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    });
  });

  it('leaves the CORS origin unset when ALLOWED_ORIGINS is missing', () => {
    const { app } = createApp();

    configureApp(app as never);

    expect(app.enableCors).toHaveBeenCalledWith({
      origin: undefined,
      credentials: true,
    });
  });
});
