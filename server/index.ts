import { mkdirSync } from 'node:fs';
import { createDb } from './db';
import { createApp } from './app';
mkdirSync('data', { recursive: true });
const db = createDb();
const server = createApp(db).listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () =>
  console.log(`Compasso disponível em http://127.0.0.1:${process.env.PORT ?? 3001}`),
);
async function close() {
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
