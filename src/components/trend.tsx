import { lazy, Suspense } from 'react';
const TrendChart = lazy(() => import('./trend-chart'));
export function Trend(props: {
  data: Record<string, string | number | null>[];
  dataKey: string;
  label: string;
  color?: string;
}) {
  return (
    <Suspense
      fallback={
        <section className="card chart">
          <h3>{props.label}</h3>
          <p className="chart-empty muted">Carregando gráfico…</p>
        </section>
      }
    >
      <TrendChart {...props} />
    </Suspense>
  );
}
