import 'dotenv/config';
import { mkdirSync, closeSync, openSync, chmodSync } from 'node:fs';
import path from 'node:path';
const url = process.env.DATABASE_URL ?? 'file:./data/personal.db';
if (!url.startsWith('file:')) throw new Error('O banco local requer DATABASE_URL=file:caminho');
const file = path.resolve(url.slice(5));
mkdirSync(path.dirname(file), { recursive: true });
closeSync(openSync(file, 'a', 0o600));
chmodSync(file, 0o600);
