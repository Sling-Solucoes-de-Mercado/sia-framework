# Guia de Segurança de Migrations

> Referência do chapéu Dados do `@dev`. Consultada em `*db-migrate`, `*db-rollback` e `*db-performance`.
> Risco: alto. Migration pode causar perda de dados e indisponibilidade.

---

## 1. Princípios

1. **Nunca altere migration já aplicada:** crie outra.
2. **Sempre tenha rollback:** um script em `supabase/rollback/` para cada migration aplicada fora do local.
3. **Teste em cópia de produção** antes de aplicar em produção.
4. **Use transação:** mudança de schema atômica.
5. **Separe schema de dados:** migrations de tipos diferentes.
6. **Aplique em horário de baixo tráfego.**

### No Supabase
- O CLI aplica cada arquivo de migration numa transação: sem `BEGIN`/`COMMIT` no arquivo e sem comandos que não rodam em transação (`CREATE INDEX CONCURRENTLY`, `VACUUM`).
- O fluxo é forward-only: não há comando de rollback. No local, `supabase db reset`; no remoto, migration nova que desfaz, ou script de rollback seguido de `supabase migration repair {versão} --status reverted`.
- `supabase db reset` é só para o banco local.
- Histórico em `supabase_migrations.schema_migrations`; divergência se resolve com `supabase migration repair`.

---

## 2. Operações seguras

```sql
-- Coluna anulável
ALTER TABLE users ADD COLUMN bio text;

-- Coluna com default constante (não reescreve a tabela)
ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;

-- Tabela nova
CREATE TABLE new_feature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);
```

### Índices
```sql
-- ✅ Não bloqueia escrita, mas não roda em transação: execute fora da migration
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
-- Na migration, para o histórico (vira no-op se o índice já existe):
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ⚠️ Bloqueia a escrita na tabela durante a criação
CREATE INDEX idx_users_email ON users (email);
```

---

## 3. Operações perigosas e alternativas

### Remover coluna
```sql
-- ❌ Perde dados
ALTER TABLE users DROP COLUMN bio;
-- ✅ Em etapas: 1. a aplicação para de escrever na coluna 2. deploy concluído
--    3. backup dos dados, se precisar 4. DROP numa migration seguinte
```

### Renomear coluna
```sql
-- ❌ Quebra as consultas da versão atual
ALTER TABLE users RENAME COLUMN name TO full_name;
-- ✅ Expand/contract:
--   migration 1: ADD COLUMN full_name; aplicação escreve nas duas
--   migration 2: copia os dados (em lotes)
--   aplicação lê a nova e escreve nas duas; depois para de escrever na antiga
--   migration 3: DROP da coluna antiga
```
Roteiro completo, com trigger de sincronização: `migration-plan-tmpl.yaml`, seção Migration sem Downtime.

### Trocar o tipo
```sql
-- ❌ Pode falhar com os dados existentes e reescreve a tabela com lock
ALTER TABLE users ALTER COLUMN age TYPE integer;
-- ✅ Coluna nova, migração dos dados, troca
ALTER TABLE users ADD COLUMN age_new integer;
UPDATE users SET age_new = age::integer;        -- em lotes se a tabela for grande
-- confira os dados; depois:
ALTER TABLE users DROP COLUMN age;
ALTER TABLE users RENAME COLUMN age_new TO age;
```

### NOT NULL em coluna existente
```sql
-- ❌ Falha se houver nulos
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- ✅ Em etapas
ALTER TABLE users ALTER COLUMN email SET DEFAULT 'desconhecido@exemplo.com';
UPDATE users SET email = 'desconhecido@exemplo.com' WHERE email IS NULL;   -- em lotes se grande
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- Tabela grande: antes do SET NOT NULL, crie CHECK (email IS NOT NULL) NOT VALID e rode
-- VALIDATE CONSTRAINT; o SET NOT NULL aproveita a constraint e evita a varredura com lock exclusivo.
```

---

## 4. Tabelas grandes

### Atualização em lotes
```sql
-- ❌ Segura locks por muito tempo
UPDATE large_table SET new_column = old_column;

-- ✅ Lotes com COMMIT (rode fora da migration: psql em autocommit; o COMMIT dentro do DO
--    só funciona fora de bloco de transação)
DO $$
DECLARE
  batch_size int := 10000;
  affected int;
BEGIN
  LOOP
    UPDATE large_table SET new_column = old_column
    WHERE id IN (SELECT id FROM large_table WHERE new_column IS NULL LIMIT batch_size);
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    COMMIT;
    PERFORM pg_sleep(0.1);   -- pausa curta entre lotes
  END LOOP;
END $$;
```
Versão retomável, com registro de progresso e `FOR UPDATE SKIP LOCKED`: `migration-plan-tmpl.yaml`, seção Migração de Dados.

### Mudança online de schema (tabela nova e troca)
```sql
-- 1. Tabela nova com o schema desejado
CREATE TABLE users_new (LIKE users INCLUDING ALL);
ALTER TABLE users_new ADD COLUMN new_field text;
-- 2. Trigger que replica as mudanças de users para users_new
CREATE TRIGGER sync_users_to_new AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION private.sync_to_users_new();
-- 3. Cópia em lotes
INSERT INTO users_new SELECT *, NULL AS new_field FROM users WHERE id BETWEEN 1 AND 10000;
-- 4. Troca dos nomes
ALTER TABLE users RENAME TO users_old;
ALTER TABLE users_new RENAME TO users;
-- 5. Ajuste das FKs, remoção do trigger
-- 6. DROP de users_old depois da verificação
```

---

## 5. Locks

- `SET LOCAL lock_timeout = '10s';` no início da aplicação: se a tabela estiver ocupada, a migration desiste em vez de enfileirar todas as consultas atrás dela.
- A maioria das formas de `ALTER TABLE` pega lock exclusivo na tabela: em tabela movimentada, só em horário de baixo tráfego.
```sql
-- Quem está esperando lock
SELECT l.pid, l.mode, l.granted, a.usename, a.state, left(a.query, 80) AS query
FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
WHERE NOT l.granted;
```

---

## 6. Estratégias de rollback

### Script de schema
```sql
-- supabase/migrations/20260115120000_add_feature.sql
ALTER TABLE users ADD COLUMN feature_enabled boolean DEFAULT false;
-- supabase/rollback/20260115120000_rollback_add_feature.sql
ALTER TABLE users DROP COLUMN feature_enabled;
```

### Backup de dados antes de transformar
```sql
CREATE TABLE private.users_backup_20260115 AS SELECT * FROM public.users;
UPDATE public.users SET status = 'active' WHERE status = 'enabled';
-- rollback, se preciso:
UPDATE public.users u SET status = b.status FROM private.users_backup_20260115 b WHERE u.id = b.id;
-- depois do período de verificação:
DROP TABLE private.users_backup_20260115;
```

### Point-in-time recovery
- Supabase: Dashboard → Database → Backups (backup diário nos planos pagos; PITR como complemento).
- Self-hosted: exige arquivamento contínuo de WAL e restauração com `recovery_target_time`.

---

## 7. Fluxo de trabalho

### Antes
- [ ] Testada no banco local (`supabase db reset`)
- [ ] Testada em staging com cópia de produção
- [ ] Rollback escrito e testado
- [ ] Backup verificado
- [ ] Time avisado da janela
- [ ] Horário de baixo tráfego escolhido
- [ ] Painéis de monitoramento prontos

### Durante
- [ ] Backup recente (snapshot) antes de começar
- [ ] Migration aplicada (`*db-migrate`)
- [ ] Schema conferido (diff dos snapshots)
- [ ] Smoke test
- [ ] Funcionalidades da aplicação conferidas
- [ ] Taxa de erros acompanhada

### Depois
- [ ] Funcionalidades confirmadas
- [ ] Desempenho das consultas conferido
- [ ] Monitoramento por 24 horas
- [ ] Problemas documentados
- [ ] Prazo de guarda do backup definido

---

## 8. RLS e Edge Functions em migrations

```sql
-- Tabela nova já nasce com RLS e policies, na mesma migration
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users,
  content text
);
CREATE INDEX idx_documents_owner_id ON public.documents (owner_id);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_owner_all ON public.documents FOR ALL TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));
```
Se a migration afeta Edge Functions: aplique a migration, depois publique as funções; no rollback, a ordem se inverte. Feature flags suavizam a transição.

---

## 9. Emergências

### Migration falhou no meio
1. Mantenha a calma e avalie o estado.
2. Confira o que foi aplicado.
3. Em transação (padrão do CLI e do `*db-migrate`), tudo foi desfeito.
4. Fora de transação, rode o rollback das partes aplicadas.
5. Se preciso, restaure o backup.

### Produção fora do ar
1. Logs da aplicação.
2. Conectividade com o banco.
3. Se a migration causou: `*db-rollback`.
4. Se o rollback falhar: restaure o backup ou PITR.
5. Comunique os envolvidos.

### Corrupção de dados
1. Pare as escritas.
2. Faça um backup do estado atual.
3. Identifique os registros afetados.
4. Restaure os dados afetados a partir do backup.
5. Investigue a causa raiz.

---

## 10. Matriz de testes

| Operação | Local | Staging | Cópia de produção | Baixo tráfego |
|----------|-------|---------|-------------------|---------------|
| Coluna nova | ✅ | ✅ | - | - |
| Índice novo | ✅ | ✅ | ✅ | ✅ |
| Remover coluna | ✅ | ✅ | ✅ | ✅ |
| Trocar tipo | ✅ | ✅ | ✅ | ✅ |
| Update grande | ✅ | ✅ | ✅ | ✅ |
| Renomear tabela | ✅ | ✅ | ✅ | ✅ |
