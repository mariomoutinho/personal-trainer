export async function api<T>(url: string, method = 'GET', data?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Compasso' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Não foi possível conectar ao servidor');
  return body as T;
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('pt-BR').format(
        new Date(value.length === 10 ? `${value}T12:00:00` : value),
      )
    : 'Não informada';
}
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Ocorreu um erro');
