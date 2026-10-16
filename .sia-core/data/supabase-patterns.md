# Padrões de Supabase

> Referência do chapéu Dados do `@dev` (e do chapéu Desenvolvimento ao integrar a aplicação).
> Consultada em `*db-setup`, `*db-migrate`, `*db-seed` e `*db-sql`.
> Plataforma: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).

---

## 1. Estrutura do projeto

```text
projeto/
├── supabase/
│   ├── config.toml          # configuração do CLI (supabase init)
│   ├── migrations/          # {AAAAMMDDHHMMSS}_{nome}.sql (supabase migration new)
│   ├── seed.sql             # seed local, aplicado por supabase db reset
│   ├── rollback/            # um script de rollback por migration aplicada fora do local
│   ├── snapshots/           # dumps antes e depois de migrar (dumps com dados fora do git)
│   ├── smoke/               # smoke tests em SQL (*db-smoke-test)
│   ├── docs/                # SCHEMA.md, DB-AUDIT.md, migration-log.md, SEED_LOG.md
│   ├── tests/               # testes pgTAP (supabase test db), opcional
│   └── functions/           # Edge Functions: {nome}/index.ts
├── src/
│   ├── lib/supabase/        # clientes do navegador e do servidor
│   └── types/database.ts    # tipos gerados
└── .env.local               # variáveis (fora do git)
```
Postgres puro: a mesma organização em `database/`, sem `config.toml`, `functions/` e `tests/`.

---

## 2. Conexões e variáveis

| Uso | Conexão | Porta |
|-----|---------|-------|
| psql, pg_dump e migrations | direta (`db.{ref}.supabase.co`, IPv6) ou pooler em modo sessão (IPv4) | 5432 |
| Aplicações serverless e edge | pooler em modo transação | 6543 |
| Banco local | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | 54322 |

- O modo transação do pooler não serve para migrations, pg_dump nem locks de sessão.
- Copie as strings exatas em Dashboard → Connect e acrescente `?sslmode=require`.

| Variável | Onde | Para quê |
|----------|------|----------|
| `SUPABASE_DB_URL` | `.env.local` | Conexão de psql e pg_dump em todas as tasks `db-*` |
| `SUPABASE_DB_URL_POOLER` | servidor | Aplicação serverless (modo transação) |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente e servidor | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente | Chave publicável (`sb_publishable_...`; legada: anon) |
| `SUPABASE_SECRET_KEY` | só servidor | Chave secreta (`sb_secret_...`; legada: service_role); ignora a RLS |
| `SUPABASE_PROJECT_REF` | CI e CLI | Mesmo valor de `integrations.supabase.projectRef` |
| `SUPABASE_ACCESS_TOKEN` | CI e MCP | Token pessoal de menor escopo |

A chave secreta nunca recebe prefixo público (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`), nunca vai para código de cliente e nunca é commitada.

---

## 3. MCP do Supabase
- Configurado pelo `@devops` (`*setup-mcp supabase` ou `sia mcp setup supabase`), em somente leitura por padrão (`integrations.supabase.mcp.readOnly: true`).
- O `@dev` usa para consultar e inspecionar: listar tabelas, rodar SQL de leitura, ver advisors (`get_advisors`), logs e documentação.
- DDL e mudança de dado em ambiente remoto: migration versionada e `*db-migrate`. Nunca SQL ad hoc via MCP.
- Escrita pelo MCP exige reconfiguração pelo `@devops` e confirmação explícita do risco.

---

## 4. Supabase CLI

Instalação: `brew install supabase/tap/supabase`, ou `npm i -D supabase` e `npx supabase`. Instalação global por npm não é suportada.

```bash
# Projeto
supabase login
supabase projects list
supabase link --project-ref {ref}
supabase status

# Ambiente local (Docker)
supabase init
supabase start
supabase stop
supabase db reset                     # SOMENTE local: recria o banco com migrations e seed

# Migrations
supabase migration new {nome}
supabase migration list               # local × remoto
supabase migration up                 # aplica as pendentes no local
supabase migration repair {versão} --status applied|reverted
supabase db diff -f {nome}            # gera migration a partir de mudanças no banco local
supabase db diff --linked             # compara as migrations com o schema remoto
supabase db push --dry-run            # lista o que seria aplicado no remoto
supabase db push                      # aplica as pendentes no projeto linkado (outro alvo: --db-url)
supabase db pull                      # traz o schema remoto como migration
supabase db dump -f {arquivo}         # dump do schema sem os schemas gerenciados (--data-only para dados)

# Tipos, testes e diagnóstico
supabase gen types typescript --linked > src/types/database.ts   # ou --local
supabase test db                      # testes pgTAP de supabase/tests/
supabase inspect db --help            # relatórios: outliers, calls e outros

# Edge Functions e segredos
supabase functions new {nome}
supabase functions serve
supabase functions deploy {nome}
supabase secrets set {NOME}={valor}
supabase secrets list
```
Cada arquivo de migration roda numa transação. Seed adicional: `[db.seed] sql_paths` no `config.toml`.

---

## 5. Clientes

### Navegador (chave publicável)
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
```

### Servidor administrativo (chave secreta)
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Só no servidor (route handler, server action, Edge Function). Ignora a RLS.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```
Em Next.js com renderização no servidor, use o pacote `@supabase/ssr` (cliente por requisição, sessão em cookies).

---

## 6. Autenticação

```typescript
// Cadastro com e-mail
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@exemplo.com',
  password: 'senha-forte',
  options: { data: { full_name: 'Nome do Usuário' } }   // vai para user_metadata: nunca use em policy
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({ email, password })

// OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: `${window.location.origin}/auth/callback` }
})

// Sessão no cliente
const { data: { session } } = await supabase.auth.getSession()
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') { /* entrou */ } else if (event === 'SIGNED_OUT') { /* saiu */ }
})
```
No servidor, valide o usuário com `supabase.auth.getUser()`, que confere o token no Auth; não confie em `getSession()` para autorização.
Dados de autorização (papel, tenant) vão em `app_metadata`, gravado só pelo servidor (API admin do Auth ou custom access token hook).

---

## 7. Banco pela API

```typescript
// Leitura tipada
const { data, error } = await supabase
  .from('profiles').select('id, username, avatar_url').eq('id', userId).single()

// Inserção com retorno
const { data, error } = await supabase
  .from('posts').insert({ title, content, author_id: userId }).select().single()

// Atualização
const { data, error } = await supabase
  .from('profiles').update({ username }).eq('id', userId).select().single()

// Exclusão
const { error } = await supabase.from('posts').delete().eq('id', postId)

// Relacionamento por FK
const { data, error } = await supabase
  .from('posts').select('id, title, author:profiles(id, username, avatar_url)').eq('id', postId).single()

// Paginação
const pageSize = 10
const page = 1
const { data, count, error } = await supabase
  .from('posts').select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range((page - 1) * pageSize, page * pageSize - 1)
```
Filtre explicitamente pelo dono (`.eq('user_id', userId)`) mesmo com RLS: ajuda o planejador a usar o índice.

---

## 8. Realtime

```typescript
const channel = supabase
  .channel('posts-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'posts', filter: `author_id=eq.${userId}` },
    (payload) => console.log('Mudança recebida:', payload))
  .subscribe()

channel.unsubscribe()   // limpeza

// Presença (usuários on-line)
const room = supabase.channel('room:lobby')
room
  .on('presence', { event: 'sync' }, () => console.log(room.presenceState()))
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await room.track({ user_id: userId, online_at: new Date() })
  })
```
A tabela precisa estar na publicação, por migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;`. O Realtime respeita a RLS.

---

## 9. Storage

```typescript
// Upload na pasta do usuário
const { data, error } = await supabase.storage
  .from('avatars').upload(`${userId}/avatar.png`, file, { cacheControl: '3600', upsert: true })

// URL pública (bucket público)
const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.png`)

// URL assinada (bucket privado), válida por 1 hora
const { data, error } = await supabase.storage
  .from('private-docs').createSignedUrl(`${userId}/documento.pdf`, 3600)
```
As policies de `storage.objects` estão em `rls-policies-tmpl.yaml` (seção Storage).

---

## 10. Edge Functions

```typescript
// supabase/functions/hello/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Cliente no contexto do usuário: a RLS vale
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return new Response(JSON.stringify({ message: `Olá, ${user?.email}` }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```
Migration e Edge Function que dependem uma da outra: aplique a migration, depois publique a função; no rollback, a ordem se inverte.

---

## 11. Tipos gerados

```bash
supabase gen types typescript --linked > src/types/database.ts    # remoto linkado
supabase gen types typescript --local > src/types/database.ts     # banco local
```
```typescript
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type InsertProfile = Database['public']['Tables']['profiles']['Insert']
type UpdateProfile = Database['public']['Tables']['profiles']['Update']
```
Regenere depois de toda migration.

---

## 12. Tratamento de erros

```typescript
async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    console.error('Erro ao buscar o perfil:', error)
    throw new Error(`Falha ao buscar o perfil: ${error.message}`)
  }
  return data
}
```
