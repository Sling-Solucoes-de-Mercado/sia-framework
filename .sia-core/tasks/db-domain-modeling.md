---
id: db-domain-modeling
title: Modelar o domínio e desenhar o schema
agent: dev
hat: data
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'contexto (opcional): PRD, epic ou story com as regras de negócio'
outputs:
  - 'docs/architecture/schema-design.md (template schema-design-tmpl.yaml), com diagrama ER'
  - 'supabase/migrations/{AAAAMMDDHHMMSS}_{nome}.sql com o schema e supabase/rollback/{versão}_rollback_{nome}.sql'
depends_on:
  tasks: [create-doc.md, execute-checklist.md]
  templates: [schema-design-tmpl.yaml, sql/migration.sql, sql/rollback.sql, sql/trigger.sql, sql/comment-on.sql, sql/rls-tenant.sql]
  checklists: [database-design-checklist.md]
  data: [database-best-practices.md, rls-security-patterns.md]
next: [db-checklist, db-migrate, db-policy]
source: [db-domain-modeling.md]
---

# Modelar o domínio e desenhar o schema

## Objetivo
Traduzir as regras de negócio num schema Postgres bem estruturado (entidades, relacionamentos, constraints, índices e RLS), documentado no design do schema e pronto para virar migration.

## Quando usar
- Schema inicial de um projeto novo.
- Novo módulo ou mudança relevante de domínio numa story.
- Não use para ajuste pontual (uma coluna, um índice): escreva a migration direto e siga com `*db-migrate`.
- Para documentar um banco que já existe (brownfield), use `*db-audit` no escopo full: ele gera `supabase/docs/SCHEMA.md` e `supabase/docs/DB-AUDIT.md`. Esta task parte desses arquivos quando for evoluir o schema.

## Modos de execução
| Modo | Comportamento |
|------|---------------|
| YOLO | Deriva entidades e regras do PRD e da story; registra as suposições na story, em `### Decisões (modo YOLO)` |
| Interativo (padrão) | Faz as perguntas do passo 1 e confirma entidades, relacionamentos e regras |
| Pre-Flight | Faz todas as perguntas dos passos 1 a 3 antes de desenhar; depois executa sem pausas |

## Pré-condições
- [ ] Requisitos disponíveis (PRD, epic ou story)
- [ ] `*db-setup` concluído (necessário para gerar a migration)

## Passos

### 1. Entender o domínio
**Ponto de elicitação:** pergunte, ou extraia dos documentos e confirme:
1. Qual é o domínio de negócio? (ex.: e-commerce, SaaS)
2. Quem são os atores? (ex.: usuários, administradores, clientes)
3. Quais são as entidades centrais?
4. Quais são os relacionamentos principais?
5. Quais regras de negócio são críticas? (ex.: pedido não pode ser excluído)
6. Quais são os casos de uso principais?
7. Qual a escala esperada? (ex.: 1 mil usuários, 100 mil pedidos por mês)
8. Há requisitos de conformidade? (ex.: LGPD)

### 2. Detalhar cada entidade
Para cada entidade, registre:
- Descrição e atributos: obrigatórios, opcionais e calculados.
- Identificador: UUID com `gen_random_uuid()` (padrão), inteiro sequencial (`bigint generated always as identity`) ou chave natural (e-mail, SKU).
- Ciclo de vida: imutável, mutável ou soft delete (`deleted_at`).
- Padrões de acesso: por id, por usuário, por período, busca textual, agregações.

### 3. Mapear relacionamentos
Para cada par de entidades: tipo (1:1, 1:N, M:N), dono, obrigatoriedade e cardinalidade, comportamento em DELETE e UPDATE (CASCADE, SET NULL, RESTRICT).
Exemplos: usuário → posts (1:N, CASCADE); post ↔ tags (M:N, tabela de junção); usuário → perfil (1:1, CASCADE).
No Supabase, o usuário vive em `auth.users`: referencie com `REFERENCES auth.users (id) ON DELETE CASCADE` e guarde os dados de aplicação numa tabela própria (`public.profiles`).

### 4. Desenhar as tabelas
```sql
CREATE TABLE public.{entidade} (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  {pai}_id uuid NOT NULL REFERENCES public.{pai} (id) ON DELETE CASCADE,
  name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,           -- atributos flexíveis
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,                                 -- soft delete
  CONSTRAINT {entidade}_name_not_empty CHECK (length(name) > 0)
);
COMMENT ON TABLE public.{entidade} IS '{propósito de negócio}';
```
Relacionamento M:N:
```sql
CREATE TABLE public.{a}_{b} (
  {a}_id uuid NOT NULL REFERENCES public.{a} (id) ON DELETE CASCADE,
  {b}_id uuid NOT NULL REFERENCES public.{b} (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ({a}_id, {b}_id)
);
CREATE INDEX idx_{a}_{b}_{b}_id ON public.{a}_{b} ({b}_id);   -- a PK já cobre {a}_id
```
O `updated_at` é mantido pelo trigger de `sql/trigger.sql`; os comentários seguem `sql/comment-on.sql`.

### 5. Transformar regras em constraints
```sql
ALTER TABLE public.customers ADD CONSTRAINT customers_email_unique UNIQUE (email);
ALTER TABLE public.orders ADD CONSTRAINT orders_total_positive CHECK (total >= 0);
ALTER TABLE public.posts ADD CONSTRAINT posts_published_has_title
  CHECK (status <> 'published' OR (title IS NOT NULL AND length(title) > 0));
```
Regras que dependem do estado anterior ou de outras linhas viram trigger. Exemplo: registro com soft delete é somente leitura, com trigger BEFORE UPDATE que levanta exceção quando `OLD.deleted_at IS NOT NULL` (padrão de validação em `sql/trigger.sql`). Nomeie as constraints pelo propósito: a mensagem de erro fica clara.

### 6. Desenhar os índices pelos padrões de acesso
```sql
CREATE INDEX idx_posts_user_id ON public.posts (user_id) WHERE deleted_at IS NULL;              -- dados do usuário e RLS
CREATE INDEX idx_posts_created_at ON public.posts (created_at DESC) WHERE deleted_at IS NULL;   -- consultas por período
CREATE INDEX idx_posts_status_created ON public.posts (status, created_at DESC);               -- filtro + ordenação
CREATE INDEX idx_posts_search ON public.posts
  USING gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, '')));  -- busca textual
CREATE INDEX idx_posts_metadata ON public.posts USING gin (metadata jsonb_path_ops);           -- consultas em JSONB
CREATE INDEX idx_posts_user_status ON public.posts (user_id, status, created_at DESC);         -- vários filtros
```
Toda FK e toda coluna usada em policy RLS tem índice. Com muitos padrões, detalhe a estratégia com `*db-performance` (template `index-strategy-tmpl.yaml`).

### 7. Definir a RLS de cada tabela
Toda tabela exposta pela API (schema `public` no Supabase) nasce com RLS habilitada e policies explícitas:
```sql
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_owner_all ON public.posts FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY posts_public_read ON public.posts FOR SELECT TO anon, authenticated
  USING (status = 'published');
```
Acesso de administrador vem de claim do servidor: `((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'`. Nunca use `user_metadata`, que o próprio usuário edita. Padrões completos em `rls-security-patterns.md`; a aplicação detalhada é feita com `*db-policy {tabela}`.

### 8. Aplicar padrões de domínio recorrentes
| Padrão | Desenho |
|--------|---------|
| Multi-tenant | `tenants` + `tenant_members (tenant_id, user_id, role)`; `tenant_id` em cada tabela do tenant; RLS por pertencimento (`sql/rls-tenant.sql`) |
| Trilha de auditoria | Tabela de log imutável + trigger AFTER INSERT/UPDATE/DELETE (`sql/trigger.sql`) |
| Hierarquia | Lista de adjacência (`parent_id`) + caminho materializado (`path uuid[]`) mantido por trigger |

### 9. Registrar decisões e documentar
- Decisões estruturais (estratégia multi-tenant, tipo de chave, soft delete, particionamento) viram ADR antes da implementação: `*create-adr {título}` com o chapéu Arquitetura.
- Gere o design com a task `create-doc` e o template `schema-design-tmpl.yaml` em `docs/architecture/schema-design.md`: modelo de domínio, diagrama ER (Mermaid), padrões de acesso, tabelas, constraints, índices e estratégia de RLS.

### 10. Validar o design
Rode `execute-checklist` com `database-design-checklist.md` (`*db-checklist`). Itens ❌ voltam ao passo correspondente.

### 11. Gerar a migration
```bash
supabase migration new {nome}     # Postgres puro: database/migrations/{AAAAMMDDHHMMSS}_{nome}.sql
```
Preencha a partir de `sql/migration.sql`, nesta ordem: extensões → tabelas e constraints → funções → triggers → RLS e policies → views → grants e comentários. Sem `BEGIN`/`COMMIT`: quem aplica envolve o arquivo numa transação. Escreva também o rollback em `supabase/rollback/{versão}_rollback_{nome}.sql` a partir de `sql/rollback.sql`.

## Boas práticas
- Comece pelas entidades centrais e acrescente complexidade aos poucos; evite otimizar cedo.
- Padrões de coluna: `id` UUID, `created_at`, `updated_at`, `deleted_at` (soft delete), `user_id` (dono).
- Pense na escala: quais tabelas crescem, quais consultas dominam, onde estão os hot paths.
- Desenhe para mudar: JSONB para atributos flexíveis, soft delete para preservar histórico, migrations aditivas sempre que possível.
- Segurança desde o início: RLS por padrão, constraints para integridade, FKs contra registros órfãos.

## Saída
```
✅ Modelo de domínio concluído
Domínio: {nome}
Entidades: {n} ({lista})
Relacionamentos: {a} → {b} (1:N), {c} ↔ {d} (M:N)
Arquivos:
- docs/architecture/schema-design.md
- supabase/migrations/{versão}_{nome}.sql
- supabase/rollback/{versão}_rollback_{nome}.sql
Próximo: *db-migrate supabase/migrations/{versão}_{nome}.sql
```

## Critérios de conclusão
- [ ] Toda entidade tem PK, timestamps e as constraints das regras de negócio
- [ ] Toda FK e toda coluna de policy tem índice
- [ ] Toda tabela exposta tem RLS e policies definidas
- [ ] database-design-checklist sem ❌ sem justificativa
- [ ] Decisões estruturais registradas em ADR
- [ ] Migration e rollback gerados, sem controle de transação no arquivo

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Regra de negócio ambígua | Pare e pergunte; no modo YOLO, registre a suposição na story |
| O modelo muda o escopo da story | Peça o ajuste da story ao `@pm` |
| Entidade sem padrão de acesso conhecido | Comece só com os índices de PK e FK; revise com `*db-performance` depois |
| Conflito com schema existente | Rode `*db-audit` (escopo schema) antes e desenhe a evolução como migration incremental |

## Handoff
Próximo passo: `@dev *db-migrate supabase/migrations/{versão}_{nome}.sql`; para RLS detalhada, `@dev *db-policy {tabela}`.
