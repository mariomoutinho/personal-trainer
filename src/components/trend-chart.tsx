import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../api';
export default function TrendChart({
  data,
  dataKey,
  label,
  color = '#357f70',
}: {
  data: Record<string, string | number | null>[];
  dataKey: string;
  label: string;
  color?: string;
}) {
  const valid = data.filter((d) => typeof d[dataKey] === 'number');
  return (
    <section className="card chart">
      <h3>{label}</h3>
      {valid.length < 2 ? (
        <p className="muted chart-empty">
          Registre ao menos dois períodos com medidas para visualizar a evolução.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e7ece8" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(String(v)).slice(0, 5)}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis width={40} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(v) => formatDate(String(v))} />
              <Line
                type="linear"
                dataKey={dataKey}
                name={label}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <details>
            <summary>Ver dados do gráfico</summary>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>{label}</th>
                </tr>
              </thead>
              <tbody>
                {valid.map((d, i) => (
                  <tr key={i}>
                    <td>{formatDate(String(d.date))}</td>
                    <td>{d[dataKey]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
