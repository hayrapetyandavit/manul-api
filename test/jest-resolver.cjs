const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

/**
 * Jest's CJS resolver does not read package "exports", so `@nestjs/outbox/postgres`
 * and `@nestjs/store-kit/postgres` fail. Node 22 can resolve them, including from
 * pnpm's nested node_modules once the basedir is realpath'd.
 */
module.exports = (request, options) => {
  if (
    request.startsWith('@nestjs/outbox/') ||
    request.startsWith('@nestjs/store-kit/')
  ) {
    const basedir = fs.realpathSync(options.basedir);
    return createRequire(path.join(basedir, 'noop.js')).resolve(request);
  }

  return options.defaultResolver(request, options);
};
