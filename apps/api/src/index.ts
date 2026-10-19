import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { ensureSuperadmin } from './utils/seedSuperadmin';
import { initRealtime } from './realtime';

async function main() {
  await connectDB();
  await ensureSuperadmin();
  const server = http.createServer(app);
  initRealtime(server);
  server.listen(env.port, () => console.log(`API + realtime listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
