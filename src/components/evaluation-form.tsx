import { useState } from 'react';
import { api, errorMessage, today } from '../api';
import type { Student, Template, Evaluation, Program, User } from '../types';
import { Button } from './ui/button';
import { ErrorBox, Field } from './common';
export function EvaluationForm({
  student,
  templates,
  programs,
  user,
  evaluation,
  onSaved,
}: {
  student: Student;
  templates: Template[];
  programs: Program[];
  user: User;
  evaluation?: Evaluation;
  onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState(evaluation?.templateId ?? templates[0]?.id ?? '');
  const template = evaluation?.template ?? templates.find((t) => t.id === templateId);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(evaluation?.answers.map((a) => [a.questionId, a.value]) ?? []),
  );
  const [date, setDate] = useState(evaluation?.date ?? today());
  const [cycle, setCycle] = useState(
    evaluation?.cycle ?? Math.max(0, ...student.evaluations.map((e) => e.cycle)) + 1,
  );
  const [evaluator, setEvaluator] = useState(evaluation?.evaluator ?? user.name);
  const [programId, setProgramId] = useState(evaluation?.programId ?? student.programId ?? '');
  const [notes, setNotes] = useState(evaluation?.notes ?? '');
  const [conclusion, setConclusion] = useState(evaluation?.conclusion ?? '');
  const [actionPlan, setActionPlan] = useState(evaluation?.actionPlan ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [id, setId] = useState(evaluation?.id);
  const [dimension, setDimension] = useState(0);
  const readonly = evaluation?.status === 'concluida';
  const dimensions = [...new Set(template?.questions.map((q) => q.dimension))];
  const answered = template?.questions.filter((q) => answers[q.id]?.trim()).length ?? 0;
  async function save(status: 'rascunho' | 'concluida') {
    setError('');
    setSaved('');
    setBusy(true);
    try {
      const result = await api<Evaluation>(
        `/students/${student.id}/evaluations${id ? `/${id}` : ''}`,
        id ? 'PUT' : 'POST',
        {
          templateId,
          date,
          cycle,
          evaluator,
          programId,
          status,
          notes,
          conclusion,
          actionPlan,
          answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        },
      );
      setId(result.id);
      setSaved('Rascunho salvo no banco de dados.');
      if (status === 'concluida') onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!template)
    return <p>Nenhum modelo disponível. Crie um modelo na página Modelos de avaliação.</p>;
  return (
    <div>
      <div className="form-grid">
        <Field label="Modelo">
          <select
            disabled={!!id || readonly}
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              setAnswers({});
              setDimension(0);
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · v{t.version}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input
            type="date"
            disabled={readonly}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Ciclo">
          <input
            type="number"
            min="1"
            disabled={readonly}
            value={cycle}
            onChange={(e) => setCycle(Number(e.target.value))}
          />
        </Field>
        <Field label="Avaliador">
          <input
            disabled={readonly}
            value={evaluator}
            onChange={(e) => setEvaluator(e.target.value)}
          />
        </Field>
        <Field label="Programa associado">
          <select
            disabled={readonly}
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            <option value="">Sem programa</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {readonly && evaluation?.programSnapshot && (
        <details>
          <summary>Programa na data da avaliação</summary>
          <pre>{JSON.stringify(JSON.parse(evaluation.programSnapshot), null, 2)}</pre>
        </details>
      )}
      <div className="progress-label">
        <span>
          {answered} de {template.questions.length} perguntas respondidas
        </span>
        <strong>{Math.round((answered / template.questions.length) * 100)}%</strong>
      </div>
      <progress value={answered} max={template.questions.length} />
      <div className="dimension-tabs">
        {dimensions.map((d, i) => (
          <button
            type="button"
            className={i === dimension ? 'selected' : ''}
            key={d}
            onClick={() => setDimension(i)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="questions">
        {template.questions
          .filter((q) => q.dimension === dimensions[dimension])
          .map((q) => (
            <fieldset key={q.id} className="question">
              <legend>
                <span className="question-number">{q.position}</span>
                {q.text}
                {q.required ? ' *' : ''}
              </legend>
              {q.type === 'choice' ? (
                <div className="option-list">
                  {q.options.map((o) => (
                    <label key={o.id} className={answers[q.id] === o.label ? 'chosen' : ''}>
                      <input
                        disabled={readonly}
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === o.label}
                        onChange={() => setAnswers({ ...answers, [q.id]: o.label })}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              ) : q.type === 'text' ? (
                <textarea
                  aria-label={q.text}
                  disabled={readonly}
                  rows={3}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              ) : (
                <input
                  aria-label={q.text}
                  disabled={readonly}
                  type="number"
                  step="any"
                  min={q.min ?? undefined}
                  max={q.max ?? undefined}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </fieldset>
          ))}
      </div>
      <div className="row between">
        <Button
          variant="outline"
          disabled={dimension === 0}
          onClick={() => setDimension((d) => d - 1)}
        >
          Anterior
        </Button>
        <span className="muted">
          Dimensão {dimension + 1} de {dimensions.length}
        </span>
        <Button
          variant="outline"
          disabled={dimension === dimensions.length - 1}
          onClick={() => setDimension((d) => d + 1)}
        >
          Próxima
        </Button>
      </div>
      <fieldset>
        <legend>Registro profissional</legend>
        <div className="form-grid">
          <Field label="Observações" wide>
            <textarea
              disabled={readonly}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field label="Conclusão profissional" wide>
            <textarea
              disabled={readonly}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
          </Field>
          <Field label="Plano de ação para o próximo ciclo" wide>
            <textarea
              disabled={readonly}
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
            />
          </Field>
        </div>
      </fieldset>
      <ErrorBox message={error} />
      {saved && (
        <p role="status" className="success">
          {saved}
        </p>
      )}
      {!readonly && (
        <div className="form-footer">
          <Button variant="outline" disabled={busy} onClick={() => save('rascunho')}>
            Salvar rascunho
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  'Concluir a avaliação? As respostas serão preservadas. A próxima avaliação será prevista conforme a duração do ciclo deste modelo.',
                )
              )
                void save('concluida');
            }}
          >
            Concluir avaliação
          </Button>
        </div>
      )}
    </div>
  );
}
