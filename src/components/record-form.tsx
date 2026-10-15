import { useState } from 'react';
import { api, errorMessage, today } from '../api';
import type { TrackingRecord, Criterion } from '../types';
import { technicalCriteria } from '../../shared/questionnaire';
import { recordSchemas, adherence, type RecordKind } from '../../shared/validation';
import { Button } from './ui/button';
import { ErrorBox, Field } from './common';
export const recordNames: Record<RecordKind, string> = {
  monthly: 'Evolução mensal',
  physical: 'Medidas físicas',
  training: 'Treinamento',
  technical: 'Avaliação técnica',
  social: 'Adaptação social e comportamental',
  note: 'Observação profissional',
};
type Descriptor = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
};
export const recordFields: Record<RecordKind, Descriptor[]> = {
  monthly: [
    { key: 'cycle', label: 'Ciclo', type: 'number', required: true, min: 1 },
    { key: 'planned', label: 'Treinos previstos', type: 'number', required: true, min: 0 },
    { key: 'completed', label: 'Treinos realizados', type: 'number', required: true, min: 0 },
    { key: 'rpe', label: 'RPE médio (0 a 10)', type: 'number', min: 0, max: 10 },
    { key: 'cardioMinutes', label: 'Cardio (minutos)', type: 'number', required: true, min: 0 },
    { key: 'notes', label: 'Observações e decisões', type: 'textarea' },
  ],
  physical: [
    { key: 'weight', label: 'Peso (kg)', type: 'number', min: 0.1 },
    { key: 'waist', label: 'Circunferência da cintura (cm)', type: 'number', min: 0.1 },
    { key: 'notes', label: 'Contexto e observações', type: 'textarea' },
  ],
  training: [
    { key: 'title', label: 'Nome da sessão', required: true },
    { key: 'status', label: 'Status', options: ['previsto', 'realizado', 'ausente'] },
    { key: 'focus', label: 'Ênfase / modalidade', required: true },
    { key: 'duration', label: 'Duração (minutos)', type: 'number', min: 0 },
    { key: 'rpe', label: 'RPE (0 a 10)', type: 'number', min: 0, max: 10 },
    { key: 'exerciseName', label: 'Exercício principal (nome padronizado)' },
    { key: 'loadKg', label: 'Carga no exercício principal (kg)', type: 'number', min: 0 },
    { key: 'repetitions', label: 'Repetições no exercício principal', type: 'number', min: 0 },
    { key: 'distanceKm', label: 'Distância do cardio (km)', type: 'number', min: 0 },
    { key: 'exercises', label: 'Demais exercícios, séries e intensidade', type: 'textarea' },
    { key: 'notes', label: 'Fadiga, dor, recuperação e observações', type: 'textarea' },
  ],
  technical: [{ key: 'notes', label: 'Observações gerais', type: 'textarea' }],
  social: [
    { key: 'environment', label: 'Adaptação ao ambiente' },
    { key: 'confidence', label: 'Confiança e autoestima' },
    { key: 'autonomy', label: 'Autonomia' },
    { key: 'motivation', label: 'Motivação e adesão' },
    { key: 'sleep', label: 'Sono e disposição' },
    {
      key: 'notes',
      label: 'Percepções, observações e próxima ação',
      type: 'textarea',
      required: true,
    },
  ],
  note: [{ key: 'notes', label: 'Observação profissional', type: 'textarea', required: true }],
};
export function RecordForm({
  studentId,
  kind,
  record,
  onSaved,
}: {
  studentId: string;
  kind: RecordKind;
  record?: TrackingRecord;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(record?.date ?? today());
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      recordFields[kind].map((f) => [f.key, String(record?.data[f.key] ?? f.options?.[0] ?? '')]),
    ),
  );
  const [criteria, setCriteria] = useState<Criterion[]>(
    (record?.data.criteria as Criterion[]) ??
      technicalCriteria.map((criterion) => ({
        criterion,
        observation: '',
        initial: '',
        current: '',
        nextAction: '',
      })),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const data: Record<string, unknown> = {};
        for (const f of recordFields[kind])
          data[f.key] =
            f.type === 'number'
              ? values[f.key] === ''
                ? null
                : Number(values[f.key])
              : (values[f.key] ?? '');
        if (kind === 'technical') data.criteria = criteria;
        const parsed = recordSchemas[kind].safeParse(data);
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join('; '));
          return;
        }
        setBusy(true);
        try {
          await api(
            `/students/${studentId}/records${record ? `/${record.id}` : ''}`,
            record ? 'PUT' : 'POST',
            { kind, date, data: parsed.data },
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
        <Field label="Data *">
          <input type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
        </Field>
        {recordFields[kind].map((f) => (
          <Field
            key={f.key}
            label={f.label + (f.required ? ' *' : '')}
            wide={f.type === 'textarea'}
          >
            {f.options ? (
              <select
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              >
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                rows={3}
                required={f.required}
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            ) : (
              <input
                type={f.type ?? 'text'}
                required={f.required}
                min={f.min}
                max={f.max}
                step={
                  ['cycle', 'planned', 'completed', 'repetitions'].includes(f.key) ? '1' : 'any'
                }
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>
      {kind === 'monthly' && (
        <p className="info">
          Adesão:{' '}
          {values.planned !== '' && values.completed !== ''
            ? (adherence(Number(values.planned), Number(values.completed)) ?? '—')
            : '—'}
          % · realizada ÷ prevista × 100. Sem previsão, a adesão não é calculada.
        </p>
      )}
      {kind === 'technical' && (
        <>
          <p className="muted">
            Registre observações qualitativas ou medidas com suas unidades. Nenhuma pontuação é
            atribuída automaticamente.
          </p>
          {criteria.map((c, i) => (
            <fieldset key={c.criterion}>
              <legend>
                {i + 1}. {c.criterion}
              </legend>
              <div className="form-grid">
                {(['observation', 'initial', 'current', 'nextAction'] as const).map((key, j) => (
                  <Field
                    key={key}
                    label={
                      [
                        'Observação ou medida',
                        'Resultado inicial',
                        'Resultado atual',
                        'Próxima ação',
                      ][j]
                    }
                  >
                    <textarea
                      value={c[key]}
                      onChange={(e) =>
                        setCriteria(
                          criteria.map((item, index) =>
                            index === i ? { ...item, [key]: e.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            </fieldset>
          ))}
        </>
      )}
      <ErrorBox message={error} />
      <div className="form-footer">
        <Button disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</Button>
      </div>
    </form>
  );
}
