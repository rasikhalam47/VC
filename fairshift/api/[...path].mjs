import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handle = require('../server.js');

export default function fairShiftApi(request, response) {
  return handle(request, response);
}
