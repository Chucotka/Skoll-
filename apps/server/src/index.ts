import { createServer } from 'node:http';
import { env } from './env.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime.js';

const app = createApp();
const server = createServer(app);
initRealtime(server);

server.listen(env.PORT, () => {
  console.log(`🍷 ToastUp server listening on ${env.SERVER_URL} (port ${env.PORT})`);
  console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
  if (env.ALLOW_DEV_AUTH) {
    console.log('   ⚠️  ALLOW_DEV_AUTH is enabled — browser dev login without Telegram is allowed.');
  }
});
