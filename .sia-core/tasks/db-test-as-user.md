---
id: db-test-as-user
title: Testar o acesso aos dados como um usuário (RLS)
agent: dev
hat: data
elicit: true
inputs:
  - 'usuário (obrigatório): UUID do usuário em auth.users, ou anon'
  - 'papel (opcional): authenticated (padrão) | anon'
  - 'objetivo (obrigatório): o que está sendo testado (ex.: o usuário lê só os próprios posts)'
outputs:
  - 'Matriz de resultados (cenário, esperado, obtido) na seção Testes da story ou em supabase/docs/rls-tests-{tabela}.md'
depends_on:
  data: [rls-security-patterns.md]
next: [db-policy, db-audit]
source: [test-as-user.md, db-impersonate.md]
---

# Testar o acesso aos dados como um usuário (RLS)

## Objetivo
Comprovar que as policies RLS deixam cada usuário ver e alterar só o que deve, emulando a sessão do usuário numa transação que é desfeita no fim.

## Quando usar
- Depois de `*db-policy` ou de qualquer migration que mexe em RLS, grants ou funções usadas por policies.
- Para investigar "o usuário não vê os próprios dados" ou "o usuário vê dados de outro".
- Uso exclusivo de teste: nunca emule claims em código de aplicação.

## Pré-condições
- [ ] Ambiente local ou staging; em produção, só cenários de leitura e com confirmação explícita
- [ ] Pelo menos dois usuários de teste (para o isolamento), cada um com dados próprios
- [ ] Conexão com um papel que pode assumir `authenticated` e `anon` (o usuário `postgres` do Supabase pode)

## Passos

### 1. Coletar o cenário
**Ponto de elicitação:** pergunte:
1. UUID do usuário a emular e de um segundo usuário (isolamento)
2. Papel: 1. authenticated (padrão) 2. anon
3. Objetivo do teste
4. Claims extras usadas pelas policies (ex.: `app_metadata.role`, `app_metadata.tenant_id`)

Mostre o aviso: a emulação é só para teste e vale apenas dentro da transação; a service role ignora RLS e não serve para testar policies.

### 2. Abrir a emulação
Sempre numa transação que termina em `ROLLBACK`: desfaz as escritas de teste e encerra a emulação.
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', '{user_id}',
  'role', 'authenticated',
  'app_metadata', json_build_object('role', '{papel_app}')     -- só se as policies usarem
)::text, true);
SELECT auth.uid() AS auth_uid, current_user AS db_role;       -- confirme usuário e papel
-- cenários do passo 3
ROLLBACK;
```
Anônimo: `SET LOCAL ROLE anon;` e claims com `'role', 'anon'`, sem `sub`.
Rode tudo numa só execução de `psql` (heredoc ou arquivo), para a emulação valer em todas as consultas. Cenários que esperam erro ficam entre `SAVEPOINT s{n};` e `ROLLBACK TO SAVEPOINT s{n};`, com o psql sem `ON_ERROR_STOP`, para registrar o erro e seguir.

### 3. Executar os cenários
| # | Cenário | Consulta | Esperado |
|---|---------|----------|----------|
| 1 | Lê só o que é seu | `SELECT count(*) FROM public.{tabela};` e a mesma contagem com `WHERE user_id = auth.uid()` | contagens iguais |
| 2 | Não vê dados de outro | `SELECT count(*) FROM public.{tabela} WHERE user_id <> auth.uid();` | 0, sem erro |
| 3 | Insere o que é seu | `INSERT INTO public.{tabela} (..., user_id) VALUES (..., auth.uid());` | sucesso |
| 4 | Não insere em nome de outro | `INSERT ... VALUES (..., '{outro_user_id}');` | erro `new row violates row-level security policy` |
| 5 | Não altera dado de outro | `UPDATE public.{tabela} SET {coluna} = {valor} WHERE user_id <> auth.uid();` | `UPDATE 0` |
| 6 | Não exclui dado de outro | `DELETE FROM public.{tabela} WHERE user_id <> auth.uid();` | `DELETE 0` |
| 7 | Anônimo | como `anon`: `SELECT count(*) FROM public.{tabela};` | 0 ou `permission denied` |
| 8 | Isolamento entre tenants | claims com o tenant A, depois com o B | cada um vê só o seu |
| 9 | Administrador por claim | `app_metadata.role = 'admin'` | conforme a regra da policy |

Teste sempre os casos positivo e negativo, todas as operações e os casos de borda (valores nulos, resultado vazio). Repita com o segundo usuário: cada um vê só o que é seu.

### 4. Diagnosticar falhas
| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| `auth.uid()` nulo | claims fora da transação ou sem `sub` | refaça o passo 2 na mesma execução do psql |
| Vê tudo | sem `SET LOCAL ROLE` (o dono da tabela ignora RLS), RLS desligada ou policy permissiva demais (policies permissivas somam com OR) | confira `current_user`, `relrowsecurity` e `pg_policies` |
| `permission denied for table` | falta GRANT para o papel (GRANT e RLS são camadas diferentes) | conceda por migration |
| Não vê os próprios dados | `USING` errado ou coluna de dono diferente | revise a policy com `*db-policy` |
| Função SECURITY DEFINER retorna dados de outros | roda com os privilégios do dono e ignora RLS | filtre por `auth.uid()` dentro da função |

### 5. Registrar
Grave a matriz (cenário, esperado, obtido, ✅ ou ❌) na seção `## Testes` da story; sem story, em `supabase/docs/rls-tests-{tabela}.md`. Cenários estáveis viram teste automatizado (pgTAP com `supabase test db`). Falha leva a `*db-policy {tabela}`.

## Saída
Matriz preenchida e a conclusão: policies aprovadas, ou lista de falhas com a correção sugerida.

## Critérios de conclusão
- [ ] Cenários aplicáveis executados como `authenticated` e como `anon`
- [ ] Isolamento verificado com pelo menos dois usuários
- [ ] Transação encerrada com ROLLBACK, sem dado de teste persistido
- [ ] Resultado registrado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `permission denied to set role` | Conecte com o usuário `postgres` do projeto |
| Postgres puro, sem `auth.uid()` | Emule o mecanismo de identidade usado pelas policies (ex.: `SET LOCAL ROLE app_user; SET LOCAL app.user_id = '{id}';`) |
| Pedido de teste com escrita em produção | Recuse e use staging |
| `current transaction is aborted` | Um cenário que espera erro ficou fora de `SAVEPOINT`; refaça a partir do passo 2 |

## Handoff
Tudo ✅: `@dev *db-audit` (escopo rls). Com falhas: `@dev *db-policy {tabela}`.
