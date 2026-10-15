import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../server/app';
import { createDb, type Db } from '../../server/db';
import { seed } from '../../server/seed';
let folder: string;
let db: Db;
let server: Server;
let base: string;
test.beforeAll(async () => {
  folder = mkdtempSync(path.join(tmpdir(), 'compasso-browser-'));
  const url = `file:${folder}/test.db`;
  writeFileSync(path.join(folder, 'test.db'), '');
  execFileSync(path.resolve('node_modules/.bin/prisma'), ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
  db = createDb(url);
  await seed(db);
  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.APP_ORIGIN = base;
});
test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  await db?.$disconnect();
  if (folder) rmSync(folder, { recursive: true, force: true });
});
test('cadastro, rascunho persistente, ciclo mensal e navegação mobile', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel('Seu nome').fill('Personal de teste');
  await page.getByLabel('E-mail', { exact: true }).fill('qa@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste-local-123');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByRole('heading', { name: 'Acompanhar faz a diferença.' })).toBeVisible();
  await page.getByRole('link', { name: 'Cadastrar aluno' }).click();
  await page.getByRole('button', { name: 'Novo aluno', exact: true }).first().click();
  await page.getByLabel('Nome completo *', { exact: true }).fill('Ana Teste');
  await page.getByLabel('Objetivo principal *', { exact: true }).fill('Evoluir força e autonomia');
  await page.getByRole('button', { name: 'Salvar aluno' }).click();
  await expect(page.getByRole('heading', { name: 'Ana Teste', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova avaliação', exact: true }).click();
  await page.getByRole('radio', { name: 'Boa', exact: true }).check();
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toHaveText('Rascunho salvo no banco de dados.');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Avaliações', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Boa', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('tab', { name: 'Evolução física', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar ciclo' }).click();
  await page.getByLabel('Ciclo *', { exact: true }).fill('1');
  await page.getByLabel('Treinos previstos *').fill('12');
  await page.getByLabel('Treinos realizados *').fill('9');
  await page.getByLabel('RPE médio (0 a 10)').fill('6');
  await page.getByLabel('Cardio (minutos) *').fill('60');
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page.getByText('75%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar ciclo' }).click();
  await page.getByLabel('Ciclo *', { exact: true }).fill('2');
  await page.getByLabel('Treinos previstos *').fill('12');
  await page.getByLabel('Treinos realizados *').fill('12');
  await page.getByLabel('RPE médio (0 a 10)').fill('5');
  await page.getByLabel('Cardio (minutos) *').fill('80');
  await page.getByRole('button', { name: 'Salvar registro' }).click();
  await expect(page.locator('.recharts-surface').first()).toBeVisible();

  await page.getByRole('tab', { name: 'Visão geral', exact: true }).click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('prontuario-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Ana Teste', exact: true })).toBeVisible();
  expect(
    (await page.getByRole('heading', { name: 'Ana Teste', exact: true }).boundingBox())!.height,
  ).toBeLessThan(40);
  const widths = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    view: window.innerWidth,
  }));
  expect(widths.doc).toBeLessThanOrEqual(widths.view);
  await page.screenshot({ path: testInfo.outputPath('prontuario-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Encerrar sessão' }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
  expect(errors).toEqual([]);
});
