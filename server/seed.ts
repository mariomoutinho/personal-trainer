import { createDb, type Db } from './db';
import { initialQuestions } from '../shared/questionnaire';
import { pathToFileURL } from 'node:url';
export async function seed(db: Db) {
  await db.evaluationTemplate.upsert({
    where: { name_version: { name: 'Acompanhamento inicial — 30 dias', version: 1 } },
    update: {},
    create: {
      name: 'Acompanhamento inicial — 30 dias',
      version: 1,
      cycleDays: 30,
      questions: {
        create: initialQuestions.map((q) => ({ ...q, options: { create: q.options } })),
      },
    },
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = createDb();
  await seed(db);
  await db.$disconnect();
  console.log('Questionário inicial disponível. Nenhum aluno fictício foi criado.');
}
