import { useState } from 'react';
import { Plus, Pencil, Trash2, Copy, ClipboardList, Dumbbell } from 'lucide-react';
import { api, errorMessage } from './api';
import { PageHeading, useCollection } from './pages';
import type { Program, Template } from './types';
import { programSchema, templateSchema } from '../shared/validation';
import { Button } from './components/ui/button';
import { Modal, ErrorBox, Empty, Field, Badge } from './components/common';
export function Programs() {
  const { data: programs, error, reload } = useCollection<Program>('/programs');
  const [editing, setEditing] = useState<Program | 'new' | null>(null);
  const [failure, setFailure] = useState('');
  return (
    <div className="page">
      <PageHeading
        eyebrow="ESTRUTURA PARA EVOLUIR"
        title="Programas de treinamento"
        description="Organize ciclos, frequências e sessões de acordo com cada objetivo."
      >
        <Button onClick={() => setEditing('new')}>
          <Plus size={17} />
          Novo programa
        </Button>
      </PageHeading>
      <ErrorBox message={error || failure} />
      {programs.length ? (
        <div className="student-grid">
          {programs.map((p) => (
            <section className="card" key={p.id}>
              <div className="row between">
                <span className="stat-icon">
                  <Dumbbell />
                </span>
                <Badge>{p.cycleDays} dias</Badge>
              </div>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <p className="muted">{p.weeklyFrequency} sessões por semana</p>
              <p className="pre-wrap">{p.sessions}</p>
              <div className="row">
                <Button variant="outline" onClick={() => setEditing(p)}>
                  <Pencil size={16} />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Excluir ${p.name}`}
                  onClick={async () => {
                    if (
                      !confirm(
                        'Excluir este programa? Avaliações anteriores mantêm uma cópia do programa utilizado.',
                      )
                    )
                      return;
                    try {
                      await api(`/programs/${p.id}`, 'DELETE');
                      await reload();
                    } catch (e) {
                      setFailure(errorMessage(e));
                    }
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="card">
          <Empty
            title="Um programa para cada trajetória"
            description="Configure livremente os dias do ciclo, a frequência e as sessões de treinamento."
            onAction={() => setEditing('new')}
            action="Criar programa"
          />
        </section>
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'Novo programa' : 'Editar programa'}
          onClose={() => setEditing(null)}
        >
          <ProgramForm
            program={editing === 'new' ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              void reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function ProgramForm({ program, onSaved }: { program?: Program; onSaved: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const parsed = programSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join('; '));
          return;
        }
        setBusy(true);
        try {
          await api(
            program ? `/programs/${program.id}` : '/programs',
            program ? 'PUT' : 'POST',
            parsed.data,
          );
          onSaved();
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <Field label="Nome *" wide>
          <input name="name" required minLength={3} defaultValue={program?.name} />
        </Field>
        <Field label="Descrição" wide>
          <textarea name="description" defaultValue={program?.description} />
        </Field>
        <Field label="Duração do ciclo (dias) *">
          <input
            name="cycleDays"
            type="number"
            required
            min={1}
            max={365}
            defaultValue={program?.cycleDays ?? 30}
          />
        </Field>
        <Field label="Sessões por semana *">
          <input
            name="weeklyFrequency"
            type="number"
            required
            min={1}
            max={14}
            defaultValue={program?.weeklyFrequency ?? 3}
          />
        </Field>
        <Field label="Organização das sessões *" wide>
          <textarea
            name="sessions"
            required
            rows={5}
            defaultValue={program?.sessions}
            placeholder="Ex.: segunda — força, ênfase anterior; quarta — cardio; sexta — força, ênfase posterior."
          />
        </Field>
      </div>
      <ErrorBox message={error} />
      <div className="form-footer">
        <Button disabled={busy}>Salvar programa</Button>
      </div>
    </form>
  );
}
export function Templates() {
  const { data: templates, error, reload } = useCollection<Template>('/templates');
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  return (
    <div className="page">
      <PageHeading
        eyebrow="ESCUTA QUE ORIENTA"
        title="Modelos de avaliação"
        description="Questionários versionados para acompanhar diferentes fases e objetivos."
      >
        <Button onClick={() => setEditing('new')}>
          <Plus size={17} />
          Novo modelo
        </Button>
      </PageHeading>
      <ErrorBox message={error} />
      <div className="info">
        Uma alteração cria uma nova versão. Os enunciados e as respostas das avaliações anteriores
        permanecem preservados.
      </div>
      <div className="student-grid">
        {templates.map((t) => (
          <section className="card" key={t.id}>
            <div className="row between">
              <span className="stat-icon">
                <ClipboardList />
              </span>
              <Badge>Versão {t.version}</Badge>
            </div>
            <h2>{t.name}</h2>
            <p className="muted">
              {t.questions.length} perguntas · ciclo de {t.cycleDays} dias
            </p>
            <div className="tag-list">
              {[...new Set(t.questions.map((q) => q.dimension))].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <details>
              <summary>Consultar perguntas e opções</summary>
              {t.questions.map((q) => (
                <div className="template-question" key={q.id}>
                  <strong>
                    {q.position}. {q.text}
                  </strong>
                  <p>
                    {q.options.length
                      ? q.options.map((o) => o.label).join(' · ')
                      : q.type === 'text'
                        ? 'Resposta livre'
                        : `${q.type === 'scale' ? 'Escala' : 'Número'}: ${q.min ?? 'sem mínimo'} a ${q.max ?? 'sem máximo'}`}
                  </p>
                </div>
              ))}
            </details>
            <Button variant="outline" onClick={() => setEditing(t)}>
              <Copy size={16} />
              Criar nova versão
            </Button>
          </section>
        ))}
      </div>
      {editing && (
        <Modal
          title={editing === 'new' ? 'Criar modelo' : 'Criar nova versão'}
          onClose={() => setEditing(null)}
        >
          <TemplateForm
            template={editing === 'new' ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              void reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
type EditableQuestion = {
  dimension: string;
  text: string;
  type: 'choice' | 'text' | 'number' | 'scale';
  required: boolean;
  options: string;
  min: string;
  max: string;
};
function TemplateForm({ template, onSaved }: { template?: Template; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? '');
  const [days, setDays] = useState(template?.cycleDays ?? 30);
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    template?.questions.map((q) => ({
      ...q,
      options: q.options.map((o) => o.label).join('\n'),
      min: q.min === null ? '' : String(q.min),
      max: q.max === null ? '' : String(q.max),
    })) ?? [
      { dimension: 'Geral', text: '', type: 'text', required: true, options: '', min: '', max: '' },
    ],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function update(i: number, part: Partial<EditableQuestion>) {
    setQuestions((q) => q.map((item, j) => (j === i ? { ...item, ...part } : item)));
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const parsed = templateSchema.safeParse({
          name,
          cycleDays: days,
          questions: questions.map((q) => ({
            ...q,
            options:
              q.type === 'choice'
                ? q.options
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((label) => ({ label }))
                : [],
            min: q.min === '' ? null : Number(q.min),
            max: q.max === '' ? null : Number(q.max),
          })),
        });
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join('; '));
          return;
        }
        setBusy(true);
        try {
          await api('/templates', 'POST', parsed.data);
          onSaved();
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <Field label="Nome do modelo *">
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Ciclo (dias) *">
          <input
            type="number"
            min={1}
            max={365}
            required
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </Field>
      </div>
      <p className="muted">Mantenha o mesmo nome para gerar a próxima versão deste modelo.</p>
      {questions.map((q, i) => (
        <fieldset key={i}>
          <legend>Pergunta {i + 1}</legend>
          <div className="form-grid">
            <Field label="Dimensão *">
              <input
                required
                value={q.dimension}
                onChange={(e) => update(i, { dimension: e.target.value })}
              />
            </Field>
            <Field label="Tipo">
              <select
                value={q.type}
                onChange={(e) => update(i, { type: e.target.value as EditableQuestion['type'] })}
              >
                <option value="text">Texto livre</option>
                <option value="choice">Múltipla escolha</option>
                <option value="number">Numérica</option>
                <option value="scale">Escala</option>
              </select>
            </Field>
            <Field label="Enunciado *" wide>
              <textarea
                required
                value={q.text}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            </Field>
            {q.type === 'choice' && (
              <Field label="Opções (uma por linha) *" wide>
                <textarea
                  required
                  value={q.options}
                  onChange={(e) => update(i, { options: e.target.value })}
                />
              </Field>
            )}
            {['number', 'scale'].includes(q.type) && (
              <>
                <Field label="Mínimo">
                  <input
                    type="number"
                    step="any"
                    required={q.type === 'scale'}
                    value={q.min}
                    onChange={(e) => update(i, { min: e.target.value })}
                  />
                </Field>
                <Field label="Máximo">
                  <input
                    type="number"
                    step="any"
                    required={q.type === 'scale'}
                    value={q.max}
                    onChange={(e) => update(i, { max: e.target.value })}
                  />
                </Field>
              </>
            )}
          </div>
          <div className="row between">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              Obrigatória
            </label>
            <Button
              type="button"
              variant="ghost"
              disabled={questions.length === 1}
              onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
            >
              Remover pergunta
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setQuestions([
            ...questions,
            {
              dimension: questions.at(-1)?.dimension ?? 'Geral',
              text: '',
              type: 'text',
              required: true,
              options: '',
              min: '',
              max: '',
            },
          ])
        }
      >
        <Plus size={16} />
        Adicionar pergunta
      </Button>
      <ErrorBox message={error} />
      <div className="form-footer">
        <Button disabled={busy}>Salvar nova versão</Button>
      </div>
    </form>
  );
}
