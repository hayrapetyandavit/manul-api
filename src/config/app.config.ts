import * as process from 'node:process';

const envConfig = {
  port: process.env.PORT || 3000,
};

export default () => envConfig;
export type EnvConfig = typeof envConfig;
