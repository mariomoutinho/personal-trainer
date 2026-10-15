# Compasso · Personal Training

Aplicação web local para acompanhar alunos, programas, avaliações e evolução. React + TypeScript + Vite no frontend; Express + Prisma + SQLite no backend. Os registros ficam no arquivo `data/personal.db` e sobrevivem ao encerramento e reinício da aplicação. Não depende de serviços pagos ou de nuvem.

## Início rápido

Requer Node.js 24 LTS e npm. Execute os comandos **na raiz deste projeto**:

```bash
npm ci
npm run db:setup
npm run dev
```

Abra **http://127.0.0.1:5173** e crie a conta do personal na primeira execução. A senha deve ter pelo menos 12 caracteres. A configuração aceita uma única conta de personal; não há credenciais padrão. O banco inicial contém o questionário, mas nenhum aluno ou programa fictício.

Para executar a versão compilada:

```bash
npm run build
APP_ORIGIN=http://127.0.0.1:3001 npm start
```

Abra **http://127.0.0.1:3001**. Para parar, pressione Ctrl+C. O backend escuta apenas em `127.0.0.1`. Use esse endereço também no navegador; `localhost` é uma origem diferente.

A configuração padrão funciona sem `.env`. Se precisar personalizar, copie `.env.example` para `.env`. O arquivo `.env` e os bancos estão ignorados pelo Git. `DATABASE_URL` aceita um caminho SQLite relativo à raiz do projeto ou absoluto. `APP_ORIGIN` deve coincidir exatamente com a origem do navegador; não use curingas. `PORT` configura o backend. Se alterar a porta em desenvolvimento, ajuste também o proxy em `vite.config.ts`.

## Funcionalidades

- Login local, senha protegida com scrypt, sessão com cookie HttpOnly/SameSite Strict e duração de 12 horas, limitação de tentativas e proteção de origem nas escritas.
- CRUD de alunos, busca por nome e filtro de status. Dados pessoais, objetivos, frequência, disponibilidade, programa, observações e informações opcionais de saúde e segurança.
- Prontuário com sete abas: visão geral, avaliações, evolução física, treinamentos, evolução técnica, adaptação social/comportamental e histórico/observações.
- Programas configuráveis: nome, descrição, duração do ciclo, frequência semanal e organização das sessões.
- Questionário inicial com as **33 perguntas fornecidas**, 26 objetivas e sete abertas, organizado em sete dimensões. Somente espaços de formatação da tabela foram normalizados; enunciados e opções mantêm o conteúdo original, inclusive a redação no feminino.
- Formulário de avaliação por dimensão, progresso, salvamento explícito de rascunho, retomada e conclusão. As respostas só são gravadas ao clicar em **Salvar rascunho** ou **Concluir avaliação**.
- Modelos configuráveis pela interface com perguntas objetivas, abertas, numéricas ou escalas. Uma alteração cria nova versão; não modifica modelos históricos.
- Avaliações concluídas são imutáveis. Para complementar uma avaliação, crie outra ou registre uma observação. O programa associado é copiado para preservar seu conteúdo histórico.
- Ao concluir a avaliação mais recente, a próxima data é calculada com a duração do ciclo do modelo; pode ser ajustada no cadastro. Avaliações retrospectivas não substituem o agendamento de um ciclo mais recente.
- Avaliação técnica com os **13 critérios descritos no pedido** e quatro campos por critério: observação/medida, resultado inicial, resultado atual e próxima ação. Comparação entre períodos sem inventar pontuações qualitativas.
- Evolução mensal com data, ciclo, treinos previstos/realizados, adesão, RPE, minutos de cardio e decisões. Adesão = realizados ÷ previstos × 100; sem previsão, fica indefinida. Pode superar 100% quando há sessões extras.
- Medidas físicas opcionais de peso e cintura. Gráficos de medidas, adesão, RPE e cardio somente com pelo menos dois registros numéricos; ausência de medida não vira zero.
- Treinos com status previsto/realizado/ausente, modalidade, duração, RPE, exercícios e observações. Campos de exercício principal, carga, repetições e distância do cardio. Comparação de carga/repetições somente entre sessões realizadas com o mesmo nome de exercício.
- Registros qualitativos de ambiente, autoestima, autonomia, motivação e sono. Respostas sociais e de recuperação das avaliações podem ser consultadas nessa aba.
- Histórico cronológico e versões anteriores nas correções de cadastro e registros. Exclusões pontuais de registros preservam uma cópia no histórico de auditoria.
- Exportação JSON do prontuário completo e exclusão definitiva do aluno com remoção em cascata de avaliações, respostas, registros e histórico.

A frequência planejada do cadastro e as contagens mensais são informadas pelo profissional. O sistema não deduz contagens mensais a partir das sessões, evitando misturar registros retrospectivos e sessões ainda não lançadas. Não há diagnósticos automáticos nem classificação clínica de respostas.

## Origem e limites do escopo

O arquivo de requisitos enviado termina incompleto no item 8, depois de “Observações e decisões”, com “Cal”. A tabela enviada posteriormente contém o questionário completo e foi incorporada. Não foram fornecidas as abas originais “Avaliação técnica” e “Evolução mensal”; esses módulos usam os critérios e indicadores explicitamente descritos no texto recebido. Se houver conteúdo adicional nessas abas ou na continuação do pedido, ele ainda precisa ser conferido e incorporado.

O produto é local e de uso por um único personal. Não inclui acesso individual dos alunos, envio de mensagens, sincronização entre computadores, recuperação de senha por e-mail ou hospedagem. Essas funcionalidades não foram presumidas. Os campos de saúde são opcionais; registre somente o necessário.

## Privacidade, backup e restauração

O acesso pela aplicação exige login. O SQLite não é criptografado: quem tiver acesso ao arquivo no computador poderá lê-lo. Proteja a conta do sistema operacional e o disco. O preparo do banco cria o arquivo com permissões restritas. Exportações contêm informações pessoais e devem ser guardadas com o mesmo cuidado.

Para fazer backup local:

1. Pare a aplicação com Ctrl+C.
2. Copie `data/personal.db` para um local protegido. Se configurou outro caminho, copie o arquivo correspondente.
3. Reinicie a aplicação.

Para restaurar, pare a aplicação, preserve uma cópia do banco atual e substitua o arquivo pelo backup. Execute `npm run db:setup` para aplicar eventuais migrações pendentes. O comando é idempotente e não apaga registros. O backup inclui conta, questionários e dados dos alunos. Ao excluir um aluno, cópias previamente exportadas e backups precisam ser tratados separadamente.

Não publique `data/`, arquivos `.db`, `.env`, exportações ou credenciais no GitHub.

## Validação

```bash
npm run lint
npm test
npm run build
npm audit
```

A suíte Vitest cobre validações e operações da API com SQLite real em diretório temporário: autenticação, proteção de origem, CRUD, persistência após reconexão, rascunhos, versionamento, conclusão imutável, escalas, correções, exportação e exclusão em cascata. Nunca usa o banco do personal.

Teste de navegador desktop/mobile:

```bash
npx playwright install chromium
npm run test:e2e
```

O teste cria um banco temporário, inicia seu próprio servidor em porta livre e remove os dados ao terminar. Caso já tenha Chromium instalado, é possível informar o caminho em `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. O teste exige um build atual; `test:e2e` o gera automaticamente.

## Organização

```text
prisma/schema.prisma       Modelos relacionais
prisma/migrations/         Histórico versionado do banco
server/app.ts              API REST, autenticação e tratamento de erros
server/evaluations.ts      Serviço transacional de avaliações
server/db.ts               Acesso Prisma / adaptador SQLite
server/security.ts         Hash de senha e sessões
shared/questionnaire.ts    Questionário e critérios originais
shared/validation.ts       Regras Zod e cálculo de adesão
src/                       Interface React e componentes
scripts/prepare-db.ts      Preparação idempotente do arquivo local
tests/                     Testes de domínio, API e navegador
```

React Hook Form gerencia o cadastro; Zod valida no cliente e no servidor. O componente Button segue o padrão composicional shadcn/ui (Radix Slot, CVA e Tailwind), e os gráficos usam Recharts. O TypeScript está em modo estrito. A aplicação não calcula diagnósticos a partir das informações de saúde.

## Evolução para nuvem / PostgreSQL

O frontend acessa exclusivamente `/api`; não conhece o banco. Para migrar, altere o datasource Prisma e o adaptador em `server/db.ts`, gere migrações próprias do PostgreSQL e transfira os dados por um processo validado de exportação/importação, preservando IDs e relações. As migrações SQLite não devem ser aplicadas diretamente no PostgreSQL. Confirme contagens, integridade e amostras históricas antes de trocar o banco ativo.

Uma implantação externa também exige HTTPS, `COOKIE_SECURE=true`, origem explícita, backups e definição de usuários/permissões. O bind em loopback é intencional para o uso local solicitado.

A configuração do Prisma 7 segue a [documentação oficial para SQLite](https://www.prisma.io/docs/v7/prisma-orm/quickstart/sqlite). Os overrides de `deepmerge-ts` e `mysql2` no pacote resolvem alertas transitivos da CLI Prisma; migrações, geração de cliente e testes foram executados com essas versões.
