import { describe, it, expect } from 'vitest';
import {
  adherence,
  dateSchema,
  monthlySchema,
  studentSchema,
  templateSchema,
  technicalSchema,
} from '../shared/validation';
import { initialQuestions, technicalCriteria } from '../shared/questionnaire';
describe('regras do acompanhamento', () => {
  it('calcula adesão sem inventar percentual quando não há previsão', () => {
    expect(adherence(12, 9)).toBe(75);
    expect(adherence(0, 0)).toBeNull();
    expect(adherence(3, 4)).toBe(133.3);
  });
  it('rejeita datas impossíveis e aceita anos bissextos', () => {
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(dateSchema.safeParse('2024-02-29').success).toBe(true);
  });
  it('valida frequência, nome e nascimento', () => {
    expect(
      studentSchema.safeParse({
        name: 'A',
        startDate: '2026-01-01',
        mainGoal: 'Força',
        weeklyFrequency: 0,
      }).success,
    ).toBe(false);
    expect(
      studentSchema.safeParse({
        name: 'Ana Silva',
        startDate: '2026-01-01',
        mainGoal: 'Força',
        birthDate: '2999-01-01',
      }).success,
    ).toBe(false);
  });
  it('limita o RPE e impede contagens negativas', () => {
    expect(
      monthlySchema.safeParse({ cycle: 1, planned: -1, completed: 2, rpe: 11, cardioMinutes: 30 })
        .success,
    ).toBe(false);
  });
  it('preserva 33 perguntas, 26 objetivas e sete abertas', () => {
    expect(initialQuestions).toHaveLength(33);
    expect(initialQuestions.filter((q) => q.type === 'choice')).toHaveLength(26);
    expect(new Set(initialQuestions.map((q) => q.dimension)).size).toBe(7);
    expect(initialQuestions[17].options.map((o) => o.label)).toEqual([
      'Muito insatisfeita',
      'Insatisfeita',
      'Neutra',
      'Satisfeita',
      'Muito satisfeita',
    ]);
    expect(initialQuestions[27].text).toBe(
      'Sentiu alguma dor diferente da dor muscular habitual? Onde, quando e qual intensidade de 0 a 10?',
    );
  });
  it('exige limites válidos para escalas', () => {
    expect(
      templateSchema.safeParse({
        name: 'Escalas',
        cycleDays: 30,
        questions: [{ dimension: 'Geral', text: 'Teste', type: 'scale', min: 10, max: 0 }],
      }).success,
    ).toBe(false);
  });
  it('exige exatamente os treze critérios sem duplicação', () => {
    const criteria = technicalCriteria.map((criterion) => ({ criterion }));
    expect(technicalSchema.safeParse({ criteria }).success).toBe(true);
    expect(technicalSchema.safeParse({ criteria: Array(13).fill(criteria[0]) }).success).toBe(
      false,
    );
  });
});
