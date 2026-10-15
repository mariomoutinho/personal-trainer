import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { studentSchema } from '../../shared/validation';
import { api, errorMessage, today } from '../api';
import type { Student, Program } from '../types';
import { Button } from './ui/button';
import { ErrorBox, Field } from './common';
const groups = [
  {
    title: 'Dados pessoais',
    fields: [
      ['name', 'Nome completo *', 'text'],
      ['birthDate', 'Data de nascimento', 'date'],
      ['phone', 'Telefone', 'tel'],
      ['email', 'E-mail', 'email'],
      ['sex', 'Sexo, quando relevante', 'text'],
      ['startDate', 'Início do acompanhamento *', 'date'],
    ],
  },
  {
    title: 'Acompanhamento',
    fields: [
      ['mainGoal', 'Objetivo principal *', 'text'],
      ['secondaryGoals', 'Objetivos secundários', 'textarea'],
      ['experience', 'Experiência anterior com musculação', 'textarea'],
      ['weeklyFrequency', 'Frequência semanal planejada *', 'number'],
      ['availability', 'Disponibilidade para treinamento', 'text'],
      ['nextEvaluationDate', 'Próxima avaliação prevista', 'date'],
      ['notes', 'Observações profissionais', 'textarea'],
    ],
  },
  {
    title: 'Saúde e segurança · preenchimento opcional',
    fields: [
      ['injuries', 'Histórico de lesões', 'textarea'],
      ['limitations', 'Limitações funcionais', 'textarea'],
      ['surgeries', 'Cirurgias relevantes', 'textarea'],
      ['conditions', 'Condições de saúde informadas', 'textarea'],
      ['medications', 'Medicamentos pertinentes ao exercício', 'textarea'],
      ['restrictions', 'Restrições ou recomendações profissionais', 'textarea'],
      ['emergencyContact', 'Contato de emergência', 'text'],
    ],
  },
];
export function StudentForm({
  student,
  programs,
  onSaved,
}: {
  student?: Student;
  programs: Program[];
  onSaved: (s: Student) => void;
}) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string | number | null>>({
    defaultValues: student
      ? ({
          ...student,
          program: undefined,
          evaluations: undefined,
          records: undefined,
          history: undefined,
        } as unknown as Record<string, string | number | null>)
      : { startDate: today(), weeklyFrequency: 3, status: 'ativo' },
  });
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setError('');
        const parsed = studentSchema.safeParse(values);
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join('; '));
          return;
        }
        try {
          onSaved(
            await api<Student>(
              student ? `/students/${student.id}` : '/students',
              student ? 'PUT' : 'POST',
              parsed.data,
            ),
          );
        } catch (e) {
          setError(errorMessage(e));
        }
      })}
    >
      <p className="muted">
        Colete apenas as informações necessárias ao acompanhamento. Os dados de saúde são opcionais.
      </p>
      {groups.map((g) => (
        <fieldset key={g.title}>
          <legend>{g.title}</legend>
          <div className="form-grid">
            {g.fields.map(([key, label, type]) => (
              <Field key={key} label={label} wide={type === 'textarea'}>
                {type === 'textarea' ? (
                  <textarea {...register(key)} rows={2} />
                ) : (
                  <input
                    {...register(key)}
                    type={type}
                    required={['name', 'startDate', 'mainGoal', 'weeklyFrequency'].includes(key)}
                    min={type === 'number' ? 1 : undefined}
                    max={type === 'number' ? 14 : undefined}
                  />
                )}
              </Field>
            ))}
            {g.title === 'Acompanhamento' && (
              <>
                <Field label="Status">
                  <select {...register('status')}>
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </Field>
                <Field label="Programa vigente">
                  <select {...register('programId')}>
                    <option value="">Sem programa</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>
        </fieldset>
      ))}
      <ErrorBox message={error} />
      <div className="form-footer">
        <Button disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar aluno'}</Button>
      </div>
    </form>
  );
}
