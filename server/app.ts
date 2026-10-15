import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import path from 'node:path';
import type { Db } from './db';
import {
  studentSchema,
  programSchema,
  templateSchema,
  recordSchema,
  recordSchemas,
} from '../shared/validation';
import { hashPassword, verifyPassword, sessionKey, newToken } from './security';
import { HttpError, saveEvaluation, templateInclude, evaluationInclude } from './evaluations';

export function createApp(db: Db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-Requested-With') !== 'Compasso')
        throw new HttpError(403, 'Origem da requisição inválida');
      const origin = req.get('Origin');
      if (origin && origin !== (process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'))
        throw new HttpError(403, 'Origem não autorizada');
    }
    next();
  });
  const cookie = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  };
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
  });
  app.get('/api/auth/status', async (req, res) => {
    const configured = (await db.user.count()) > 0;
    const session = req.cookies.session
      ? await db.session.findUnique({
          where: { id: sessionKey(req.cookies.session) },
          include: { user: true },
        })
      : null;
    res.json({
      configured,
      user:
        session && session.expiresAt > new Date()
          ? { name: session.user.name, email: session.user.email }
          : null,
    });
  });
  const credentials = z.object({
    email: z.email().transform((v) => v.toLowerCase()),
    password: z.string().min(12, 'Use pelo menos 12 caracteres').max(128),
    name: z.string().trim().min(2).max(120).optional(),
  });
  app.post('/api/auth/setup', authLimit, async (req, res) => {
    const data = credentials.extend({ name: z.string().trim().min(2).max(120) }).parse(req.body);
    const passwordHash = await hashPassword(data.password);
    const user = await db.$transaction(async (tx) => {
      if (await tx.user.count()) throw new HttpError(409, 'A conta já foi configurada');
      return tx.user.create({ data: { name: data.name, email: data.email, passwordHash } });
    });
    const token = newToken();
    await db.session.create({
      data: {
        id: sessionKey(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + cookie.maxAge),
      },
    });
    res.cookie('session', token, cookie).status(201).json({ name: user.name, email: user.email });
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const data = credentials.parse(req.body);
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user || !(await verifyPassword(data.password, user.passwordHash)))
      throw new HttpError(401, 'E-mail ou senha inválidos');
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const token = newToken();
    await db.session.create({
      data: {
        id: sessionKey(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + cookie.maxAge),
      },
    });
    res.cookie('session', token, cookie).json({ name: user.name, email: user.email });
  });
  app.use('/api', async (req, _res, next) => {
    const token = req.cookies.session;
    const session =
      typeof token === 'string'
        ? await db.session.findUnique({ where: { id: sessionKey(token) } })
        : null;
    if (!session || session.expiresAt < new Date())
      throw new HttpError(401, 'Entre na sua conta para continuar');
    next();
  });
  app.post('/api/auth/logout', async (req, res) => {
    await db.session.deleteMany({ where: { id: sessionKey(req.cookies.session) } });
    res.clearCookie('session', { ...cookie, maxAge: undefined }).json({ ok: true });
  });
  app.get('/api/programs', async (_req, res) =>
    res.json(await db.program.findMany({ orderBy: { createdAt: 'desc' } })),
  );
  app.post('/api/programs', async (req, res) =>
    res.status(201).json(await db.program.create({ data: programSchema.parse(req.body) })),
  );
  app.put('/api/programs/:id', async (req, res) =>
    res.json(
      await db.program.update({
        where: { id: String(req.params.id) },
        data: programSchema.parse(req.body),
      }),
    ),
  );
  app.delete('/api/programs/:id', async (req, res) => {
    const id = String(req.params.id);
    if (await db.student.count({ where: { programId: id } }))
      throw new HttpError(409, 'Remova este programa dos alunos antes de excluí-lo');
    await db.program.delete({ where: { id } });
    res.json({ ok: true });
  });
  app.get('/api/templates', async (_req, res) =>
    res.json(
      await db.evaluationTemplate.findMany({
        include: templateInclude,
        orderBy: [{ name: 'asc' }, { version: 'desc' }],
      }),
    ),
  );
  app.post('/api/templates', async (req, res) => {
    const data = templateSchema.parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const last = await tx.evaluationTemplate.findFirst({
        where: { name: data.name },
        orderBy: { version: 'desc' },
      });
      return tx.evaluationTemplate.create({
        data: {
          name: data.name,
          cycleDays: data.cycleDays,
          version: (last?.version ?? 0) + 1,
          questions: {
            create: data.questions.map((q, i) => ({
              ...q,
              position: i + 1,
              options: { create: q.options.map((o, j) => ({ ...o, position: j })) },
            })),
          },
        },
        include: templateInclude,
      });
    });
    res.status(201).json(result);
  });
  app.get('/api/students', async (_req, res) =>
    res.json(
      await db.student.findMany({
        include: {
          program: true,
          evaluations: {
            select: { id: true, date: true, status: true },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      }),
    ),
  );
  app.post('/api/students', async (req, res) => {
    const data = studentSchema.parse(req.body);
    const student = await db.student.create({
      data: { ...data, history: { create: { action: 'Cadastro criado', detail: {} } } },
      include: { program: true },
    });
    res.status(201).json(student);
  });
  const studentInclude = {
    program: true,
    evaluations: {
      include: evaluationInclude,
      orderBy: [{ date: 'desc' as const }, { createdAt: 'desc' as const }],
    },
    records: { orderBy: [{ date: 'desc' as const }, { createdAt: 'desc' as const }] },
    history: { orderBy: { createdAt: 'desc' as const } },
  };
  app.get('/api/students/:id', async (req, res) => {
    const s = await db.student.findUnique({
      where: { id: String(req.params.id) },
      include: studentInclude,
    });
    if (!s) throw new HttpError(404, 'Aluno não encontrado');
    res.json(s);
  });
  app.put('/api/students/:id', async (req, res) => {
    const id = String(req.params.id);
    const data = studentSchema.parse(req.body);
    const result = await db.$transaction(async (tx) => {
      const before = await tx.student.findUnique({ where: { id } });
      if (!before) throw new HttpError(404, 'Aluno não encontrado');
      const s = await tx.student.update({ where: { id }, data });
      await tx.historyEntry.create({
        data: {
          studentId: id,
          action: 'Cadastro atualizado',
          detail: { before: JSON.parse(JSON.stringify(before)) },
        },
      });
      return s;
    });
    res.json(result);
  });
  app.delete('/api/students/:id', async (req, res) => {
    await db.student.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
  app.get('/api/students/:id/export', async (req, res) => {
    const s = await db.student.findUnique({
      where: { id: String(req.params.id) },
      include: studentInclude,
    });
    if (!s) throw new HttpError(404, 'Aluno não encontrado');
    res
      .attachment(`aluno-${s.id}.json`)
      .json({ exportedAt: new Date().toISOString(), formatVersion: 1, student: s });
  });
  app.post('/api/students/:id/evaluations', async (req, res) =>
    res.status(201).json(await saveEvaluation(db, String(req.params.id), req.body)),
  );
  app.put('/api/students/:id/evaluations/:evaluationId', async (req, res) =>
    res.json(
      await saveEvaluation(db, String(req.params.id), req.body, String(req.params.evaluationId)),
    ),
  );
  app.delete('/api/students/:id/evaluations/:evaluationId', async (req, res) => {
    await db.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.findFirst({
        where: { id: String(req.params.evaluationId), studentId: String(req.params.id) },
      });
      if (!evaluation) throw new HttpError(404, 'Avaliação não encontrada');
      if (evaluation.status === 'concluida')
        throw new HttpError(409, 'Avaliações concluídas são preservadas');
      await tx.evaluation.delete({ where: { id: evaluation.id } });
      await tx.historyEntry.create({
        data: {
          studentId: evaluation.studentId,
          action: 'Rascunho excluído',
          detail: { evaluationId: evaluation.id },
        },
      });
    });
    res.json({ ok: true });
  });
  app.post('/api/students/:id/records', async (req, res) => {
    const input = recordSchema.parse(req.body);
    const data = recordSchemas[input.kind].parse(input.data);
    const record = await db.$transaction(async (tx) => {
      const r = await tx.trackingRecord.create({
        data: { studentId: String(req.params.id), kind: input.kind, date: input.date, data },
      });
      await tx.historyEntry.create({
        data: {
          studentId: r.studentId,
          action: 'Registro adicionado',
          detail: { recordId: r.id, kind: r.kind, date: r.date },
        },
      });
      return r;
    });
    res.status(201).json(record);
  });
  app.put('/api/students/:id/records/:recordId', async (req, res) => {
    const input = recordSchema.parse(req.body);
    const data = recordSchemas[input.kind].parse(input.data);
    const result = await db.$transaction(async (tx) => {
      const before = await tx.trackingRecord.findFirst({
        where: { id: String(req.params.recordId), studentId: String(req.params.id) },
      });
      if (!before) throw new HttpError(404, 'Registro não encontrado');
      if (before.kind !== input.kind)
        throw new HttpError(400, 'Tipo do registro não pode ser alterado');
      const r = await tx.trackingRecord.update({
        where: { id: before.id },
        data: { date: input.date, data },
      });
      await tx.historyEntry.create({
        data: {
          studentId: before.studentId,
          action: 'Registro corrigido',
          detail: { before: JSON.parse(JSON.stringify(before)) },
        },
      });
      return r;
    });
    res.json(result);
  });
  app.delete('/api/students/:id/records/:recordId', async (req, res) => {
    await db.$transaction(async (tx) => {
      const r = await tx.trackingRecord.findFirst({
        where: { id: String(req.params.recordId), studentId: String(req.params.id) },
      });
      if (!r) throw new HttpError(404, 'Registro não encontrado');
      await tx.trackingRecord.delete({ where: { id: r.id } });
      await tx.historyEntry.create({
        data: {
          studentId: r.studentId,
          action: 'Registro excluído',
          detail: { before: JSON.parse(JSON.stringify(r)) },
        },
      });
    });
    res.json({ ok: true });
  });
  app.use('/api', (_req, _res) => {
    throw new HttpError(404, 'Recurso não encontrado');
  });
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
        return;
      }
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (typeof error === 'object' && error && 'code' in error) {
        const code = error.code;
        if (code === 'P2025') {
          res.status(404).json({ error: 'Registro não encontrado' });
          return;
        }
        if (code === 'P2002' || code === 'P2003') {
          res.status(409).json({ error: 'Dados duplicados ou vínculo inválido' });
          return;
        }
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: 'JSON inválido' });
        return;
      }
      console.error('Falha interna:', error instanceof Error ? error.name : 'erro');
      res.status(500).json({ error: 'Não foi possível concluir a operação' });
    },
  );
  return app;
}
