import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Users,
  LayoutDashboard,
  ClipboardList,
  Dumbbell,
  LogOut,
  ArrowUpRight,
  Plus,
  Search,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import { api, errorMessage, today, formatDate } from './api';
import type { Student, Program, User } from './types';
import { Button } from './components/ui/button';
import { Modal, ErrorBox, Empty, Badge, Field } from './components/common';
import { StudentForm } from './components/student-form';
import { StudentDetail } from './student-detail';
import { Programs, Templates } from './settings-pages';

export function App() {
  const [auth, setAuth] = useState<{ configured: boolean; user: User | null } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api<{ configured: boolean; user: User | null }>('/auth/status')
      .then(setAuth)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);
  if (error)
    return (
      <div className="auth-wrap">
        <ErrorBox message={error} />
        <Button
          onClick={() => {
            setError('');
            load();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  if (!auth) return <div className="loading">Carregando seu espaço…</div>;
  if (!auth.user) return <Auth configured={auth.configured} onDone={load} />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          <span>
            compasso<small>PERSONAL TRAINING</small>
          </span>
        </Link>
        <p className="nav-label">SEU ESPAÇO DE TRABALHO</p>
        <nav>
          {[
            ['/', LayoutDashboard, 'Visão geral'],
            ['/alunos', Users, 'Alunos'],
            ['/programas', Dumbbell, 'Programas'],
            ['/modelos', ClipboardList, 'Modelos de avaliação'],
          ].map(([to, Icon, label]) => {
            const I = Icon as typeof Users;
            return (
              <NavLink key={String(to)} to={String(to)} end={to === '/'}>
                <I size={19} />
                {String(label)}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Seu acompanhamento, protegido</strong>
              <p>Acesso restrito à sua conta local.</p>
            </div>
          </div>
          <div className="user-line">
            <span className="avatar">{auth.user.name.slice(0, 1)}</span>
            <div>
              <strong>{auth.user.name}</strong>
              <small>Personal trainer</small>
            </div>
            <Button
              variant="ghost"
              aria-label="Sair"
              onClick={async () => {
                try {
                  await api('/auth/logout', 'POST');
                  load();
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <span>Gestão de acompanhamento</span>
          <span className="row">
            <span className="status-dot" />
            Espaço local
            <Button
              variant="ghost"
              aria-label="Encerrar sessão"
              onClick={async () => {
                try {
                  await api('/auth/logout', 'POST');
                  load();
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              <LogOut size={16} />
            </Button>
          </span>
        </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alunos" element={<Students />} />
          <Route path="/alunos/:id" element={<StudentDetail user={auth.user} />} />
          <Route path="/programas" element={<Programs />} />
          <Route path="/modelos" element={<Templates />} />
          <Route
            path="*"
            element={
              <Empty
                title="Página não encontrada"
                description="Volte à visão geral para continuar."
              />
            }
          />
        </Routes>
        <footer className="page-footer">
          Compasso · Acompanhamento com atenção a cada pessoa.
        </footer>
      </main>
    </div>
  );
}
function Auth({ configured, onDone }: { configured: boolean; onDone: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="auth-wrap">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <Activity />
          </span>
          compasso
        </div>
        <p className="eyebrow">MAIS QUE RESULTADOS. PESSOAS.</p>
        <h1>
          Cada evolução
          <br />
          tem seu ritmo.
        </h1>
        <p>Um espaço para acompanhar o movimento, a confiança e as conquistas de cada aluno.</p>
        <div className="auth-art">
          <span />
          <span />
          <span />
          <Activity size={110} />
        </div>
      </section>
      <section className="auth-form">
        <span className="eyebrow">SEU ESPAÇO DE ACOMPANHAMENTO</span>
        <h2>{configured ? 'Bem-vindo de volta.' : 'Vamos começar.'}</h2>
        <p className="muted">
          {configured
            ? 'Entre para continuar cuidando de cada trajetória.'
            : 'Crie sua conta de personal. Não é necessário contratar nenhum serviço.'}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setBusy(true);
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await api(`/auth/${configured ? 'login' : 'setup'}`, 'POST', data);
              onDone();
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {!configured && (
            <Field label="Seu nome">
              <input name="name" required minLength={2} autoComplete="name" />
            </Field>
          )}
          <Field label="E-mail">
            <input name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Senha">
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete={configured ? 'current-password' : 'new-password'}
              required
            />
          </Field>
          <p className="muted small">Use pelo menos 12 caracteres.</p>
          <ErrorBox message={error} />
          <Button disabled={busy}>
            {busy ? 'Aguarde…' : configured ? 'Entrar no Compasso' : 'Criar minha conta'}
            <ArrowUpRight size={18} />
          </Button>
        </form>
        <div className="auth-privacy">
          <ShieldCheck size={18} /> Seus registros são armazenados no banco local deste computador.
        </div>
      </section>
    </div>
  );
}
export function useCollection<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setData(await api<T[]>(endpoint));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
function Dashboard() {
  const { data: students, error, loading } = useCollection<Student>('/students');
  const active = students.filter((s) => s.status === 'ativo');
  const due = active.filter((s) => s.nextEvaluationDate && s.nextEvaluationDate <= today());
  return (
    <div className="page">
      <PageHeading
        eyebrow="CADA PASSO CONTA"
        title="Acompanhar faz a diferença."
        description="Uma visão do seu trabalho e das pessoas que evoluem com você."
      >
        <Button asChild>
          <Link to="/alunos">
            <Plus size={17} />
            Cadastrar aluno
          </Link>
        </Button>
      </PageHeading>
      <ErrorBox message={error} />
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">PRESENÇA QUE TRANSFORMA</span>
          <h2>
            Olhe para o progresso.
            <br />
            Cuide de toda a trajetória.
          </h2>
          <p>
            Força, autonomia, disposição e confiança.
            <br />
            Cada dimensão merece ser acompanhada.
          </p>
          <Link to="/alunos">
            Acompanhar meus alunos <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <span className="orbit orbit1" />
          <span className="orbit orbit2" />
          <span className="orbit orbit3" />
          <Activity size={100} />
          <span className="art-tag">UM PASSO DE CADA VEZ</span>
        </div>
      </section>
      <div className="stats">
        <Stat
          label="Alunos ativos"
          value={active.length}
          caption="Trajetórias em acompanhamento"
          icon={<Users />}
        />
        <Stat
          label="Avaliações a realizar"
          value={due.length}
          caption="Previstas para hoje ou em atraso"
          icon={<ClipboardList />}
        />
        <Stat
          label="Sessões planejadas / semana"
          value={active.reduce((sum, s) => sum + s.weeklyFrequency, 0)}
          caption="Soma das frequências dos alunos ativos"
          icon={<Dumbbell />}
        />
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <h2>Seus alunos</h2>
            <Link to="/alunos">
              Ver todos <ArrowUpRight size={15} />
            </Link>
          </div>
          {loading ? (
            <p className="muted">Carregando alunos…</p>
          ) : students.length === 0 ? (
            <Empty
              title="Sua primeira trajetória começa aqui"
              description="Cadastre um aluno para organizar avaliações, treinos e evolução."
              onAction={() => location.assign('/alunos')}
              action="Cadastrar primeiro aluno"
            />
          ) : (
            students.slice(0, 5).map((s) => (
              <Link key={s.id} to={`/alunos/${s.id}`} className="student-row">
                <span className="avatar">
                  {s.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div className="grow">
                  <strong>{s.name}</strong>
                  <small>{s.mainGoal}</small>
                </div>
                <Badge>{s.status}</Badge>
                <ArrowUpRight size={17} />
              </Link>
            ))
          )}
        </section>
        <section className="card">
          <div className="section-heading">
            <h2>Próximos cuidados</h2>
            <CalendarDays size={19} />
          </div>
          {due.length ? (
            due.slice(0, 5).map((s) => (
              <Link className="due-item" key={s.id} to={`/alunos/${s.id}`}>
                <span className="date-square">{s.nextEvaluationDate?.slice(8)}</span>
                <div>
                  <strong>{s.name}</strong>
                  <small>Avaliação · {formatDate(s.nextEvaluationDate)}</small>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <div className="quiet-state">
              <CalendarDays size={34} />
              <h3>Nenhuma avaliação pendente</h3>
              <p>Defina a próxima data no cadastro de cada aluno para acompanhar os ciclos.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
export function Stat({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card stat">
      <div className="row between">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}
function Students() {
  const { data: students, error, loading, reload } = useCollection<Student>('/students');
  const { data: programs } = useCollection<Program>('/programs');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [create, setCreate] = useState(false);
  const navigate = useNavigate();
  const filtered = students.filter(
    (s) =>
      s.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) &&
      (!status || s.status === status),
  );
  return (
    <div className="page">
      <PageHeading
        eyebrow="PESSOAS E TRAJETÓRIAS"
        title="Seus alunos"
        description="Encontre cada pessoa e continue de onde parou."
      >
        <Button onClick={() => setCreate(true)}>
          <Plus size={17} />
          Novo aluno
        </Button>
      </PageHeading>
      <ErrorBox message={error} />
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar aluno pelo nome"
            placeholder="Buscar aluno pelo nome…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="pausado">Pausados</option>
          <option value="inativo">Inativos</option>
        </select>
        <span className="muted">{filtered.length} aluno(s)</span>
      </div>
      {loading ? (
        <p>Carregando…</p>
      ) : filtered.length ? (
        <div className="student-grid">
          {filtered.map((s) => (
            <Link key={s.id} to={`/alunos/${s.id}`} className="card student-card">
              <div className="row between">
                <span className="avatar large">
                  {s.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <Badge>{s.status}</Badge>
              </div>
              <h2>{s.name}</h2>
              <p>{s.mainGoal}</p>
              <div className="student-meta">
                <span>
                  <Dumbbell size={15} />
                  {s.weeklyFrequency}× por semana
                </span>
                <span>{s.program?.name ?? 'Sem programa definido'}</span>
              </div>
              <div className="row between card-link">
                Ver acompanhamento
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <Empty
            title={
              query || status ? 'Nenhum aluno encontrado' : 'Vamos conhecer seu primeiro aluno?'
            }
            description={
              query || status
                ? 'Ajuste a busca ou o filtro.'
                : 'Cadastre os dados essenciais e comece um acompanhamento completo.'
            }
            onAction={() => setCreate(true)}
            action="Novo aluno"
          />
        </div>
      )}
      {create && (
        <Modal title="Cadastrar aluno" onClose={() => setCreate(false)}>
          <StudentForm
            programs={programs}
            onSaved={(s) => {
              setCreate(false);
              void reload();
              navigate(`/alunos/${s.id}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
