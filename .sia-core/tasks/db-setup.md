---
id: db-setup
title: Configurar o banco de dados (Supabase ou Postgres)
agent: dev
hat: data
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'alvo (opcional): supabase-novo | supabase-existente | supabase-local | postgres; se ausente, detecta e pergunta'
  - 'estrutura (opcional): minimal | standard | full (padrão: standard)'
outputs:
  - 'Projeto Supabase linkado (supabase/config.toml) ou estrutura database/ para Postgres puro'
  - 'Estrutura base: migrations/, rollback/, snapshots/, smoke/, docs/ e seed.sql'
  - '.env.local com as variáveis de conexão (fora do git) e os nomes registrados no .env.example'
  - 'integrations.supabase.enabled e projectRef atualizados em .sia-core/core-config.yaml'
depends_on:
  templates: [sql/migration.sql, sql/trigger.sql, sql/smoke-test.sql]
  data: [supabase-patterns.md]
next: [db-model, db-migrate]
source: [setup-database.md, db-supabase-setup.md, db-env-check.md, db-bootstrap.md]
---

# Configurar o banco de dados

## Objetivo
Deixar o projeto pronto para trabalhar com o banco: ferramentas checadas, projeto Supabase linkado (ou Postgres puro configurado), estrutura de pastas criada e variáveis de conexão definidas sem expor segredos.

## Quando usar
- Início do projeto ou primeira story que envolve banco.
- Projeto existente que ainda não tem `supabase/` (ou `database/`) organizado.
- Para revalidar o ambiente antes de migrar: rode só o passo 6.
- Fora do escopo: bancos que não são Postgres (MongoDB, MySQL, SQLite). Registre a decisão em ADR (`*create-adr`) e trate a configuração como story comum.

## Modos de execução
| Modo | Comportamento |
|------|---------------|
| YOLO | Detecta o alvo pelo contexto, usa a estrutura `standard` e registra as decisões; só pergunta o project ref e a senha do banco |
| Interativo (padrão) | Confirma alvo, estrutura, extensões e baseline |
| Pre-Flight | Coleta tudo antes (alvo, região, ref, estrutura, extensões, baseline) e executa sem pausas |

## Pré-condições
- [ ] Terminal na raiz do projeto, com permissão de escrita
- [ ] Supabase local: Docker em execução
- [ ] Projeto remoto: acesso ao Dashboard do Supabase (ref do projeto e senha do banco)

## Convenções do chapéu Dados
- Todas as tasks `db-*` conectam por `$SUPABASE_DB_URL` (psql e pg_dump). No Postgres puro, aponte essa variável para o seu banco.
- Pastas: `supabase/` no Supabase; `database/` no Postgres puro, com as mesmas subpastas.
- Nunca imprima a URL com senha. Para mostrar o alvo: `printf '%s' "$SUPABASE_DB_URL" | sed -E 's#://([^:/]+):[^@]*@#://\1:***@#'`
- O MCP do Supabase (configurado pelo `@devops *setup-mcp supabase`) serve para consulta e inspeção, em somente leitura (`integrations.supabase.mcp.readOnly`). DDL e mudança de dado em ambiente remoto passam por migration versionada e `*db-migrate`, nunca por SQL ad hoc via MCP.

## Passos

### 1. Detectar o contexto
- Leia `integrations.supabase` em `.sia-core/core-config.yaml` (`enabled`, `projectRef`).
- Verifique se já existem `supabase/config.toml`, `supabase/migrations/` ou `database/`.
- Procure a escolha de banco nos documentos: `grep -rliE "supabase|postgres" docs/prd* docs/architecture* 2>/dev/null`

**Ponto de elicitação:** apresente o alvo detectado como sugestão e pergunte:
1. Supabase, projeto novo
2. Supabase, projeto existente (link)
3. Supabase, só local (Docker)
4. Postgres puro (gerenciado ou self-hosted)

### 2. Checar as ferramentas
```bash
supabase --version || echo "❌ Supabase CLI ausente: brew install supabase/tap/supabase (ou npm i -D supabase e use npx supabase)"
psql --version     || echo "❌ psql ausente: instale o cliente do PostgreSQL"
pg_dump --version  || echo "❌ pg_dump ausente: necessário para os snapshots"
docker info >/dev/null 2>&1 && echo "✓ Docker ativo" || echo "⚠️ Docker parado (necessário só para o Supabase local)"
git --version      || echo "⚠️ git ausente (recomendado)"
```
A instalação global por `npm install -g supabase` não é suportada. No Postgres puro, o Supabase CLI é dispensável.

### 3. Ligar o projeto
**Supabase, projeto novo:**
1. `supabase login`
2. No Dashboard, crie o projeto: nome, organização, região (a mais próxima dos usuários) e senha forte do banco. Aguarde o provisionamento (2 a 3 minutos).
3. Continue como projeto existente.

**Supabase, projeto existente:**
```bash
supabase login
supabase projects list                  # localize o ref
[ -f supabase/config.toml ] || supabase init
supabase link --project-ref {ref}       # pede a senha do banco
```
Atualize `.sia-core/core-config.yaml`: `integrations.supabase.enabled: true` e `projectRef: '{ref}'`. Confira em `supabase/config.toml` se `[db] major_version` é a versão do Postgres remoto.

**Supabase, só local:**
```bash
[ -f supabase/config.toml ] || supabase init
supabase start     # API 54321, banco 54322, Studio 54323
supabase status    # URLs e chaves locais
```
Banco local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

**Postgres puro:** crie o banco no provedor e anote a URL (`postgresql://{usuário}:{senha}@{host}:5432/{banco}?sslmode=require`).

### 4. Criar a estrutura base
**Ponto de elicitação:** escolha a estrutura:
1. Mínima (`minimal`): só as pastas
2. Padrão (`standard`): pastas + READMEs curtos + `docs/migration-log.md` + `.gitignore` (recomendado)
3. Completa (`full`): padrão + migration baseline + smoke test inicial (projetos novos)

Se `supabase/` já existe, não sobrescreva nada: crie só o que falta. Havendo conflito, pergunte: 1. mesclar (padrão) 2. fazer backup (`mv supabase supabase.backup-{AAAAMMDD}`) e recriar 3. cancelar.

```bash
mkdir -p supabase/migrations supabase/rollback supabase/snapshots supabase/smoke supabase/docs
[ -f supabase/seed.sql ] || printf -- '-- Seed local: aplicado por supabase db reset\n' > supabase/seed.sql
```

| Caminho | Conteúdo |
|---------|----------|
| `supabase/config.toml` | Configuração do CLI (gerada por `supabase init`) |
| `supabase/migrations/` | `{AAAAMMDDHHMMSS}_{nome}.sql`, criadas com `supabase migration new {nome}` |
| `supabase/seed.sql` | Seed local, aplicado por `supabase db reset` (mais arquivos em `[db.seed] sql_paths`) |
| `supabase/rollback/` | `{versão}_rollback_{nome}.sql`, um por migration aplicada em ambiente remoto (versionado) |
| `supabase/snapshots/` | Dumps de schema antes e depois de migrar (`*db-migrate`) |
| `supabase/smoke/` | Smoke tests em SQL (`*db-smoke-test`); `supabase/tests/` fica reservado ao pgTAP |
| `supabase/docs/` | `migration-log.md`, `SEED_LOG.md`, relatórios de auditoria e de desempenho |

Estrutura padrão, além das pastas:
- `supabase/migrations/README.md`: nome `{AAAAMMDDHHMMSS}_{nome}.sql`; ordem dentro do arquivo (extensões → tabelas e constraints → funções → triggers → RLS → views); fluxo pelo `*db-migrate`.
- `supabase/rollback/README.md`: um script por migration, desfazendo na ordem inversa.
- `supabase/docs/migration-log.md`:
```markdown
# Log de migrations

### {versão}: {nome} ({AAAA-MM-DD})
- Arquivo: supabase/migrations/{arquivo}.sql
- Ambiente: local | staging | produção
- Status: ✅ aplicada | ❌ falhou | ⏪ revertida
- Mudanças: o que mudou
- Rollback: supabase/rollback/{arquivo} ou snapshot
```
- `.gitignore` (acrescente o que faltar):
```gitignore
.env.local
.env*.local
supabase/.branches
supabase/.temp
supabase/snapshots/*_data.sql
*.dump
*.backup
```
Snapshots de schema podem ser versionados por decisão do projeto (em repositório público, não versione). Dumps com dados nunca vão para o git.

Estrutura completa, além da padrão:
- Migration baseline: `supabase migration new baseline`, preenchida a partir de `sql/migration.sql`. Exemplo de perfil ligado ao Auth:
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
-- trigger de updated_at: sql/trigger.sql
```
- Smoke test inicial: copie `sql/smoke-test.sql` para `supabase/smoke/smoke_test.sql` e preencha as expectativas.

Postgres puro: a mesma estrutura em `database/` (`migrations/`, `rollback/`, `snapshots/`, `smoke/`, `docs/` e `seeds/`). As migrations são aplicadas uma a uma pelo `*db-migrate`, que registra cada uma no `database/docs/migration-log.md`.

### 5. Definir as variáveis de ambiente
Copie as strings de conexão em Dashboard → Connect (Supabase) ou do provedor (Postgres puro) e grave em `.env.local`, fora do git:
```bash
# psql, pg_dump e migrations: conexão direta (IPv6) ou pooler em modo sessão (porta 5432, IPv4)
SUPABASE_DB_URL="postgresql://postgres.{ref}:{senha}@{host-do-pooler}:5432/postgres?sslmode=require"
# Aplicações serverless e edge: pooler em modo transação (porta 6543)
SUPABASE_DB_URL_POOLER="postgresql://postgres.{ref}:{senha}@{host-do-pooler}:6543/postgres"
# Cliente: pode ir para o navegador
NEXT_PUBLIC_SUPABASE_URL="https://{ref}.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="{sb_publishable_...}"
# Somente servidor: ignora a RLS
SUPABASE_SECRET_KEY="{sb_secret_...}"
SUPABASE_PROJECT_REF="{ref}"
```
Projetos antigos usam as chaves legadas `anon` e `service_role` no lugar da publishable e da secret; as regras são as mesmas.
Regras:
- A chave secreta (ou a service role) ignora RLS. Nunca use prefixo público (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`), nunca importe em código de cliente e nunca commite.
- Use o prefixo público do framework do projeto só nas variáveis de cliente.
- Registre apenas os nomes, sem valores, no `.env.example` do projeto (inclua `SUPABASE_DB_URL` e `SUPABASE_DB_URL_POOLER`).
- Confira o código: `grep -rnE "SECRET_KEY|sb_secret_|SERVICE_ROLE|service_role" --exclude-dir=node_modules src app lib 2>/dev/null`. Todo uso precisa ser de servidor (route handler, server action, Edge Function).

### 6. Validar o ambiente
```bash
set -a; . ./.env.local; set +a
test -n "$SUPABASE_DB_URL" || { echo "❌ SUPABASE_DB_URL ausente"; exit 1; }
echo "✓ alvo: $(printf '%s' "$SUPABASE_DB_URL" | sed -E 's#://([^:/]+):[^@]*@#://\1:***@#')"
case "$SUPABASE_DB_URL" in *sslmode=*) echo "✓ sslmode definido";; *) echo "⚠️ acrescente ?sslmode=require";; esac
case "$SUPABASE_DB_URL" in *:6543/*) echo "⚠️ porta 6543 (modo transação): use 5432 para migrations e pg_dump";; esac
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -tAc "select version()" >/dev/null && echo "✓ conexão ok"
SERVER=$(psql "$SUPABASE_DB_URL" -tAc "show server_version_num" | cut -c1-2)
DUMP=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
[ "$DUMP" -ge "$SERVER" ] && echo "✓ pg_dump $DUMP compatível com o servidor $SERVER" \
  || echo "⚠️ pg_dump $DUMP é mais antigo que o servidor $SERVER: atualize o cliente ou use supabase db dump"
```
Supabase local: rode a mesma validação com `SUPABASE_DB_URL` apontando para o banco local.

### 7. Extensões e tipos
Extensões entram por migration, nunca ad hoc no remoto. No Supabase, instale no schema `extensions`:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;      -- funções de criptografia
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;       -- busca por similaridade
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;     -- requisições HTTP a partir do banco
-- CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;    -- só com dados geoespaciais
```
- `pg_stat_statements` já vem ativa no Supabase; no Postgres puro, habilite por migration (o `*db-performance` depende dela).
- Para UUID use `gen_random_uuid()`, nativo; `uuid-ossp` é dispensável.
- Tipos TypeScript (app em TS): `supabase gen types typescript --linked > src/types/database.ts` (local: `--local`). Regenere depois de cada migration.

### 8. Resumir
Mostre: alvo sem senha, estrutura criada, variáveis definidas (só nomes), extensões e pendências. Opcional: conectar o MCP do Supabase com `@devops *setup-mcp supabase`.

## Saída
```
✅ Banco configurado
Alvo: {supabase remoto | supabase local | postgres} ({alvo sem senha})
Estrutura: supabase/{migrations, rollback, snapshots, smoke, docs} + seed.sql + config.toml
Variáveis: SUPABASE_DB_URL, SUPABASE_DB_URL_POOLER, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_PROJECT_REF
Próximo: *db-model (desenhar o schema) ou *db-migrate {migration}
```

## Critérios de conclusão
- [ ] Ferramentas checadas e ausências obrigatórias resolvidas
- [ ] Supabase: `supabase/config.toml` existe e o projeto está linkado (ou o local está rodando); core-config atualizado
- [ ] Estrutura base criada sem sobrescrever arquivos existentes
- [ ] `.env.local` fora do git; `.env.example` só com nomes; chave secreta (ou service role) sem prefixo público e sem uso no cliente
- [ ] Conexão validada e versão do pg_dump compatível com o servidor

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `could not connect to server` | Confira host e senha em Dashboard → Connect; em rede sem IPv6, use o pooler em modo sessão (porta 5432) |
| Erro de SSL | Acrescente `?sslmode=require` à URL |
| `permission denied for schema public` | Conecte com o usuário `postgres` do projeto; chaves da API não servem para o psql |
| `supabase start` falha | Docker parado ou portas 54321 a 54323 ocupadas; rode `supabase stop` e tente de novo |
| `supabase link` recusa a senha | Redefina a senha do banco no Dashboard e repita |
| `pg_dump` mais antigo que o servidor | Atualize o cliente do PostgreSQL ou use `supabase db dump` |

## Handoff
Próximo passo: `@dev *db-model` para modelar o domínio, ou `@dev *db-migrate {migration}` se as migrations já existem.
