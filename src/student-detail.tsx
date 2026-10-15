import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Download,
  Trash2,
  Target,
  CalendarDays,
  Activity,
} from 'lucide-react';
import { api, errorMessage, formatDate, today } from './api';
import type {
  Student,
  Program,
  Template,
  User,
  Evaluation,
  TrackingRecord,
  Criterion,
} from './types';
import { useCollection, Stat } from './pages';
import { Button } from './components/ui/button';
import { Empty, ErrorBox, Modal, Badge } from './components/common';
import { StudentForm } from './components/student-form';
import { EvaluationForm } from './components/evaluation-form';
import { RecordForm, recordNames, recordFields } from './components/record-form';
import { Trend } from './components/trend';
import { adherence, type RecordKind } from '../shared/validation';
import { technicalCriteria } from '../shared/questionnaire';
const tabs = [
  'Visão geral',
  'Avaliações',
  'Evolução física',
  'Treinamentos',
  'Evolução técnica',
  'Adaptação social e comportamental',
  'Histórico e observações',
];
export function StudentDetail({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [edit, setEdit] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | 'new' | null>(null);
  const [record, setRecord] = useState<{ kind: RecordKind; record?: TrackingRecord } | null>(null);
  const { data: programs } = useCollection<Program>('/programs');
  const { data: templates } = useCollection<Template>('/templates');
  const load = useCallback(async () => {
    try {
      setStudent(await api<Student>(`/students/${id}`));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);
  useEffect(() => {
    setStudent(null);
    void load();
  }, [load]);
  if (!student)
    return (
      <div className="page">
        <ErrorBox message={error} />
        {!error && <p>Carregando prontuário…</p>}
        <Link to="/alunos">Voltar para alunos</Link>
      </div>
    );
  const monthly = student.records.filter((r) => r.kind === 'monthly');
  const lastMonthly = monthly[0];
  const lastEvaluation = student.evaluations.find((e) => e.status === 'concluida');
  const days = Math.max(
    0,
    Math.floor((new Date(today()).getTime() - new Date(student.startDate).getTime()) / 86400000),
  );
  const add = (kind: RecordKind) => setRecord({ kind });
  const chartData = (kind: RecordKind) =>
    student.records
      .filter((r) => r.kind === kind)
      .slice()
      .reverse()
      .map((r) => ({
        date: r.date,
        ...Object.fromEntries(
          Object.entries(r.data).filter(([, v]) => typeof v === 'number' || v === null),
        ),
      })) as Record<string, string | number | null>[];
  async function removeRecord(r: TrackingRecord) {
    if (
      !confirm(
        'Excluir este registro da visualização? A versão anterior será preservada no histórico de correções.',
      )
    )
      return;
    try {
      await api(`/students/${id}/records/${r.id}`, 'DELETE');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const recordList = (kind: RecordKind) => (
    <RecordList
      records={student.records.filter((r) => r.kind === kind)}
      onEdit={(r) => setRecord({ kind, record: r })}
      onDelete={removeRecord}
      onAdd={() => add(kind)}
    />
  );
  return (
    <div className="page">
      <Link className="back-link" to="/alunos">
        <ArrowLeft size={16} />
        Todos os alunos
      </Link>
      <div className="profile-heading">
        <span className="avatar profile">
          {student.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div className="grow">
          <div className="row">
            <h1>{student.name}</h1>
            <Badge>{student.status}</Badge>
          </div>
          <p className="muted">
            Desde {formatDate(student.startDate)} · {days} dias de acompanhamento
          </p>
        </div>
        <Button variant="outline" onClick={() => setEdit(true)}>
          <Pencil size={16} />
          Editar cadastro
        </Button>
      </div>
      <div className="profile-tabs" role="tablist" aria-label="Prontuário">
        {tabs.map((t, i) => (
          <button
            role="tab"
            id={`tab-${i}`}
            aria-controls="profile-panel"
            aria-selected={tab === i}
            className={tab === i ? 'selected' : ''}
            key={t}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      <div id="profile-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 0 && (
          <>
            <div className="stats">
              <Stat
                label="Objetivo principal"
                value={student.mainGoal}
                caption={student.secondaryGoals || 'Objetivos individuais'}
                icon={<Target />}
              />
              <Stat
                label="Frequência planejada"
                value={`${student.weeklyFrequency}× / semana`}
                caption={student.program?.name ?? 'Programa ainda não definido'}
                icon={<Activity />}
              />
              <Stat
                label="Próxima avaliação"
                value={
                  student.nextEvaluationDate ? formatDate(student.nextEvaluationDate) : 'A definir'
                }
                caption={`Última: ${lastEvaluation ? formatDate(lastEvaluation.date) : 'ainda não realizada'}`}
                icon={<CalendarDays />}
              />
            </div>
            {student.restrictions && (
              <div className="professional-alert">
                <strong>Recomendações profissionais</strong>
                <p>{student.restrictions}</p>
              </div>
            )}
            <div className="dashboard-grid">
              <section className="card">
                <div className="section-heading">
                  <h2>O momento atual</h2>
                  <Button variant="ghost" onClick={() => setTab(2)}>
                    Ver evolução ↗
                  </Button>
                </div>
                {lastMonthly ? (
                  <div className="metrics">
                    <div>
                      <strong>
                        {adherence(
                          Number(lastMonthly.data.planned),
                          Number(lastMonthly.data.completed),
                        ) ?? '—'}
                        %
                      </strong>
                      <small>Adesão · ciclo {String(lastMonthly.data.cycle)}</small>
                    </div>
                    <div>
                      <strong>{String(lastMonthly.data.rpe ?? '—')}</strong>
                      <small>RPE médio / 10</small>
                    </div>
                    <div>
                      <strong>{String(lastMonthly.data.cardioMinutes)} min</strong>
                      <small>Cardio no ciclo</small>
                    </div>
                  </div>
                ) : (
                  <Empty
                    title="Vamos registrar o primeiro ciclo?"
                    description="Acompanhe adesão, esforço e condicionamento ao longo do tempo."
                    onAction={() => add('monthly')}
                  />
                )}
              </section>
              <section className="card">
                <h2>Programa vigente</h2>
                {student.program ? (
                  <>
                    <h3>{student.program.name}</h3>
                    <p>{student.program.description}</p>
                    <p className="muted">
                      Ciclos de {student.program.cycleDays} dias · {student.program.weeklyFrequency}{' '}
                      sessões por semana
                    </p>
                    <p className="pre-wrap">{student.program.sessions}</p>
                  </>
                ) : (
                  <p className="muted">Crie um programa e associe-o em Editar cadastro.</p>
                )}
                <Button variant="outline" onClick={() => setEvaluation('new')}>
                  <Plus size={16} />
                  Nova avaliação
                </Button>
              </section>
            </div>
            <section className="card details-card">
              <h2>Informações do acompanhamento</h2>
              <dl>
                {[
                  ['Disponibilidade', student.availability],
                  ['Experiência anterior', student.experience],
                  ['Observações profissionais', student.notes],
                  ['Nascimento', student.birthDate ? formatDate(student.birthDate) : ''],
                  ['Telefone', student.phone],
                  ['E-mail', student.email],
                  ['Sexo', student.sex],
                  ['Lesões', student.injuries],
                  ['Limitações', student.limitations],
                  ['Cirurgias', student.surgeries],
                  ['Condições informadas', student.conditions],
                  ['Medicamentos pertinentes', student.medications],
                  ['Emergência', student.emergencyContact],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </section>
            <section className="card privacy-card">
              <div>
                <h3>Privacidade e controle dos dados</h3>
                <p className="muted">
                  Exporte o prontuário completo ou exclua definitivamente os dados deste aluno.
                </p>
              </div>
              <div className="row">
                <Button variant="outline" asChild>
                  <a href={`/api/students/${student.id}/export`} download>
                    <Download size={16} />
                    Exportar JSON
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (
                      prompt(
                        `Esta ação exclui permanentemente o cadastro e todo o histórico. Digite o nome completo para confirmar: ${student.name}`,
                      ) !== student.name
                    )
                      return;
                    try {
                      await api(`/students/${student.id}`, 'DELETE');
                      navigate('/alunos');
                    } catch (e) {
                      setError(errorMessage(e));
                    }
                  }}
                >
                  <Trash2 size={16} />
                  Excluir aluno
                </Button>
              </div>
            </section>
          </>
        )}
        {tab === 1 && (
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>Avaliações periódicas</h2>
                <p className="muted">
                  Cada ciclo guarda suas próprias respostas e a versão do questionário.
                </p>
              </div>
              <Button onClick={() => setEvaluation('new')}>
                <Plus size={16} />
                Nova avaliação
              </Button>
            </div>
            {student.evaluations.length ? (
              <div className="evaluation-list">
                {student.evaluations.map((e) => (
                  <div className="evaluation-item" key={e.id}>
                    <span className="cycle">{String(e.cycle).padStart(2, '0')}</span>
                    <div className="grow">
                      <h3>
                        Ciclo {e.cycle} · {formatDate(e.date)}
                      </h3>
                      <p>
                        {e.template.name} · v{e.template.version} · {e.evaluator}
                      </p>
                    </div>
                    <Badge>{e.status}</Badge>
                    <Button variant="outline" onClick={() => setEvaluation(e)}>
                      {e.status === 'rascunho' ? 'Continuar' : 'Ver respostas'}
                    </Button>
                    {e.status === 'rascunho' && (
                      <Button
                        variant="ghost"
                        aria-label="Excluir rascunho"
                        onClick={async () => {
                          if (!confirm('Excluir este rascunho?')) return;
                          try {
                            await api(`/students/${id}/evaluations/${e.id}`, 'DELETE');
                            await load();
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="A primeira avaliação conta uma história"
                description="Registre a percepção do aluno nas sete dimensões do questionário."
                onAction={() => setEvaluation('new')}
                action="Iniciar avaliação"
              />
            )}
          </section>
        )}
        {tab === 2 && (
          <>
            <div className="section-heading">
              <div>
                <h2>Evolução física e mensal</h2>
                <p className="muted">
                  Compare medidas e indicadores sem perder os registros anteriores.
                </p>
              </div>
              <div className="row">
                <Button variant="outline" onClick={() => add('physical')}>
                  Registrar medidas
                </Button>
                <Button onClick={() => add('monthly')}>
                  <Plus size={16} />
                  Registrar ciclo
                </Button>
              </div>
            </div>
            <div className="chart-grid">
              <Trend data={chartData('physical')} dataKey="weight" label="Peso (kg)" />
              <Trend data={chartData('physical')} dataKey="waist" label="Cintura (cm)" />
              <Trend
                data={chartData('monthly').map((r) => ({
                  ...r,
                  adherence: adherence(Number(r.planned), Number(r.completed)),
                }))}
                dataKey="adherence"
                label="Adesão (%)"
              />
              <Trend data={chartData('monthly')} dataKey="rpe" label="RPE médio (0 a 10)" />
              <Trend data={chartData('monthly')} dataKey="cardioMinutes" label="Cardio (minutos)" />
            </div>
            <section className="card">
              <h2>Ciclos mensais</h2>
              {recordList('monthly')}
            </section>
            <section className="card details-card">
              <h2>Medidas e observações</h2>
              {recordList('physical')}
            </section>
          </>
        )}
        {tab === 3 && (
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>Treinamentos</h2>
                <p className="muted">
                  Sessões previstas, realizadas e ausências, com esforço e observações.
                </p>
              </div>
              <Button onClick={() => add('training')}>
                <Plus size={16} />
                Nova sessão
              </Button>
            </div>
            <TrainingTrends records={student.records.filter((r) => r.kind === 'training')} />
            {recordList('training')}
          </section>
        )}
        {tab === 4 && (
          <>
            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Evolução técnica</h2>
                  <p className="muted">
                    13 critérios para observar a qualidade do movimento e a adaptação.
                  </p>
                </div>
                <Button onClick={() => add('technical')}>
                  <Plus size={16} />
                  Avaliar técnica
                </Button>
              </div>
              <TechnicalComparison
                records={student.records.filter((r) => r.kind === 'technical')}
              />
              {recordList('technical')}
            </section>
          </>
        )}
        {tab === 5 && (
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>Adaptação social e comportamental</h2>
                <p className="muted">
                  Escuta, acolhimento, autonomia e confiança ao longo do tempo.
                </p>
              </div>
              <Button onClick={() => add('social')}>
                <Plus size={16} />
                Registrar observação
              </Button>
            </div>
            {recordList('social')}
            <h3>Percepção nas avaliações concluídas</h3>
            {student.evaluations
              .filter((e) => e.status === 'concluida')
              .map((e) => (
                <details key={e.id}>
                  <summary>
                    Ciclo {e.cycle} · {formatDate(e.date)}
                  </summary>
                  <dl>
                    {e.template.questions
                      .filter((q) =>
                        [
                          'Adaptação social',
                          'Adesão e motivação',
                          'Recuperação e disposição',
                        ].includes(q.dimension),
                      )
                      .map((q) => (
                        <div key={q.id}>
                          <dt>{q.text}</dt>
                          <dd>
                            {e.answers.find((a) => a.questionId === q.id)?.value ?? 'Sem resposta'}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </details>
              ))}
          </section>
        )}
        {tab === 6 && (
          <>
            <section className="card">
              <div className="section-heading">
                <h2>Observações profissionais</h2>
                <Button onClick={() => add('note')}>
                  <Plus size={16} />
                  Nova observação
                </Button>
              </div>
              {recordList('note')}
            </section>
            <section className="card details-card">
              <h2>Histórico cronológico</h2>
              <p className="muted">
                Do mais recente ao mais antigo. Correções preservam os dados anteriores.
              </p>
              <div className="timeline">
                {student.history.map((h) => (
                  <article key={h.id}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{h.action}</strong>
                      <small>{new Date(h.createdAt).toLocaleString('pt-BR')}</small>
                      <details>
                        <summary>Detalhes do registro</summary>
                        <pre>{JSON.stringify(h.detail, null, 2)}</pre>
                      </details>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
      {edit && (
        <Modal title="Editar cadastro" onClose={() => setEdit(false)}>
          <StudentForm
            student={student}
            programs={programs}
            onSaved={() => {
              setEdit(false);
              void load();
            }}
          />
        </Modal>
      )}
      {evaluation && (
        <Modal
          title={
            evaluation === 'new'
              ? 'Nova avaliação'
              : evaluation.status === 'concluida'
                ? 'Avaliação concluída'
                : 'Continuar avaliação'
          }
          onClose={() => {
            setEvaluation(null);
            void load();
          }}
        >
          <EvaluationForm
            student={student}
            templates={templates}
            programs={programs}
            user={user}
            evaluation={evaluation === 'new' ? undefined : evaluation}
            onSaved={() => {
              setEvaluation(null);
              void load();
            }}
          />
        </Modal>
      )}
      {record && (
        <Modal title={recordNames[record.kind]} onClose={() => setRecord(null)}>
          <RecordForm
            studentId={student.id}
            {...record}
            onSaved={() => {
              setRecord(null);
              void load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function RecordList({
  records,
  onEdit,
  onDelete,
  onAdd,
}: {
  records: TrackingRecord[];
  onEdit: (r: TrackingRecord) => void;
  onDelete: (r: TrackingRecord) => void;
  onAdd: () => void;
}) {
  if (!records.length)
    return (
      <Empty
        title="Ainda não há registros"
        description="Cada registro ajuda a compreender a evolução ao longo do tempo."
        onAction={onAdd}
      />
    );
  return (
    <div className="record-list">
      {records.map((r) => (
        <article className="record-item" key={r.id}>
          <div className="row between">
            <h3>
              {formatDate(r.date)}
              {r.kind === 'monthly' ? ` · Ciclo ${r.data.cycle}` : ''}
            </h3>
            <div className="row">
              <Button
                variant="ghost"
                aria-label={`Editar registro de ${formatDate(r.date)}`}
                onClick={() => onEdit(r)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                aria-label={`Excluir registro de ${formatDate(r.date)}`}
                onClick={() => onDelete(r)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
          <dl className="record-values">
            {recordFields[r.kind].map((f) =>
              r.data[f.key] !== null && r.data[f.key] !== '' ? (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{String(r.data[f.key] ?? '—')}</dd>
                </div>
              ) : null,
            )}
            {r.kind === 'monthly' && (
              <div>
                <dt>Adesão</dt>
                <dd>
                  {adherence(Number(r.data.planned), Number(r.data.completed)) === null
                    ? 'Sem previsão'
                    : `${adherence(Number(r.data.planned), Number(r.data.completed))}%`}
                </dd>
              </div>
            )}
          </dl>
          {r.kind === 'technical' && (
            <details>
              <summary>Ver os 13 critérios</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Critério</th>
                      <th>Observação / medida</th>
                      <th>Inicial</th>
                      <th>Atual</th>
                      <th>Próxima ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.data.criteria as Criterion[]).map((c) => (
                      <tr key={c.criterion}>
                        <th>{c.criterion}</th>
                        <td>{c.observation || '—'}</td>
                        <td>{c.initial || '—'}</td>
                        <td>{c.current || '—'}</td>
                        <td>{c.nextAction || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}
function TechnicalComparison({ records }: { records: TrackingRecord[] }) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  if (records.length < 2) return null;
  const a = records.find((r) => r.id === first) ?? records[records.length - 1];
  const b = records.find((r) => r.id === second) ?? records[0];
  return (
    <details className="comparison">
      <summary>Comparar períodos</summary>
      <div className="form-grid">
        <label>
          Período inicial
          <select value={a.id} onChange={(e) => setFirst(e.target.value)}>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDate(r.date)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Período atual
          <select value={b.id} onChange={(e) => setSecond(e.target.value)}>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDate(r.date)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Critério</th>
              <th>{formatDate(a.date)}</th>
              <th>{formatDate(b.date)}</th>
              <th>Próxima ação</th>
            </tr>
          </thead>
          <tbody>
            {technicalCriteria.map((c) => (
              <tr key={c}>
                <th>{c}</th>
                <td>
                  {(a.data.criteria as Criterion[]).find((x) => x.criterion === c)?.current || '—'}
                </td>
                <td>
                  {(b.data.criteria as Criterion[]).find((x) => x.criterion === c)?.current || '—'}
                </td>
                <td>
                  {(b.data.criteria as Criterion[]).find((x) => x.criterion === c)?.nextAction ||
                    '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function TrainingTrends({ records }: { records: TrackingRecord[] }) {
  const [exercise, setExercise] = useState('');
  const names = [
    ...new Set(
      records
        .filter(
          (r) =>
            r.data.status === 'realizado' &&
            typeof r.data.exerciseName === 'string' &&
            r.data.exerciseName.trim(),
        )
        .map((r) => String(r.data.exerciseName)),
    ),
  ];
  const selected = names.includes(exercise) ? exercise : names[0];
  const data = records
    .filter((r) => r.data.status === 'realizado' && r.data.exerciseName === selected)
    .slice()
    .reverse()
    .map((r) => ({
      date: r.date,
      loadKg: typeof r.data.loadKg === 'number' ? r.data.loadKg : null,
      repetitions: typeof r.data.repetitions === 'number' ? r.data.repetitions : null,
    }));
  if (!names.length) return null;
  return (
    <div>
      <label className="field">
        Comparar o mesmo exercício
        <select value={selected} onChange={(e) => setExercise(e.target.value)}>
          {names.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <p className="muted small">
        Compare cargas junto com repetições, técnica e condições da sessão. O sistema não atribui
        uma pontuação de força.
      </p>
      <div className="chart-grid">
        <Trend data={data} dataKey="loadKg" label="Carga (kg)" />
        <Trend data={data} dataKey="repetitions" label="Repetições" />
      </div>
    </div>
  );
}
