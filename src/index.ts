import { app } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { ensureSuperadmin } from './utils/seedSuperadmin';

async function main() {
  await connectDB();
  await ensureSuperadmin();
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
