import type { EnvConfig } from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  function loadConfig(env: NodeJS.ProcessEnv): EnvConfig {
    process.env = { ...originalEnv, ...env };
    let config: EnvConfig | undefined;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      config = require('./app.config').default();
    });

    return config as EnvConfig;
  }

  it('falls back to defaults when variables are unset', () => {
    const config = loadConfig({
      PORT: '',
      ALLOWED_ORIGINS: '',
    });

    expect(config).toEqual({
      port: 3000,
      allowedOrigins: '',
    });
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      PORT: '4000',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    });

    expect(config).toEqual({
      port: '4000',
      allowedOrigins: 'http://localhost:5173',
    });
  });
});
