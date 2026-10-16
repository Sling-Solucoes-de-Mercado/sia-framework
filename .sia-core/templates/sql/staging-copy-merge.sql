-- =============================================================================
-- Template de carga por staging: CSV → tabela temporária → validação → merge
-- Uso: *db-seed com arquivo CSV, em duas execuções do psql:
--   Fase 1 (validação): passos 1 a 4, numa sessão; revise o relatório com o usuário.
--   Fase 2 (merge): passos 1 a 6, numa nova sessão com --single-transaction.
--   A tabela TEMP existe só durante a sessão: cada fase recria e recarrega.
-- Placeholders: {{staging_table}}, {{target_table}}, {{csv_path}}, {{column1}},
--      {{column2}}, {{type2}}, {{accepted_errors}}
-- Regras: `\copy` lê o arquivo do lado do cliente (o COPY de arquivo do servidor não
--      funciona no Supabase); colunas de staging como text, com cast explícito no merge.
-- =============================================================================

-- 1. STAGING (temporária, colunas text) ---------------------------------------
CREATE TEMP TABLE {{staging_table}} (
  _row_number bigserial,                 -- ordem das linhas no arquivo
  id text,
  {{column1}} text,
  {{column2}} text,
  _import_status text NOT NULL DEFAULT 'pending',   -- pending | insert | update | duplicate | error
  _import_error text
);

-- 2. CARGA ----------------------------------------------------------------------
-- A: arquivo CSV (lado do cliente)
\copy {{staging_table}} (id, {{column1}}, {{column2}}) FROM '{{csv_path}}' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"', NULL '')
-- B: entrada padrão (programático):  COPY {{staging_table}} (id, {{column1}}, {{column2}}) FROM STDIN WITH (FORMAT csv);
-- C: outra consulta:                 INSERT INTO {{staging_table}} (id, {{column1}}, {{column2}}) SELECT ...;

-- 3. VALIDAÇÃO --------------------------------------------------------------------
-- Obrigatórios ausentes
UPDATE {{staging_table}}
SET _import_status = 'error', _import_error = 'Campo obrigatório ausente'
WHERE id IS NULL OR {{column1}} IS NULL;

-- Tipos inválidos (Postgres 16 ou mais novo; em versões anteriores, use regex)
UPDATE {{staging_table}}
SET _import_status = 'error', _import_error = 'Tipo inválido em {{column2}}'
WHERE _import_status = 'pending'
  AND {{column2}} IS NOT NULL AND NOT pg_input_is_valid({{column2}}, '{{type2}}');

-- Duplicados no próprio arquivo: vale a primeira ocorrência
UPDATE {{staging_table}} s
SET _import_status = 'duplicate', _import_error = 'ID duplicado no arquivo'
WHERE _import_status = 'pending'
  AND EXISTS (SELECT 1 FROM {{staging_table}} s2 WHERE s2.id = s.id AND s2._row_number < s._row_number);

-- Já existem no destino: viram atualização
UPDATE {{staging_table}} s
SET _import_status = 'update'
WHERE _import_status = 'pending'
  AND EXISTS (SELECT 1 FROM public.{{target_table}} t WHERE t.id = s.id::uuid);

-- O restante vira inserção
UPDATE {{staging_table}} SET _import_status = 'insert' WHERE _import_status = 'pending';

-- 4. RELATÓRIO ---------------------------------------------------------------------
SELECT _import_status, count(*) AS rows, string_agg(DISTINCT _import_error, '; ') AS errors
FROM {{staging_table}} GROUP BY _import_status ORDER BY _import_status;
-- Fim da FASE 1. Mostre o relatório e confirme o merge com o usuário.

-- 5. MERGE (FASE 2, em transação única) -----------------------------------------
-- Trava: aborta se surgiram mais erros que os aceitos na fase 1
DO $$
BEGIN
  IF (SELECT count(*) FROM {{staging_table}} WHERE _import_status IN ('error', 'duplicate')) > {{accepted_errors}} THEN
    RAISE EXCEPTION 'Mais linhas com erro que as aceitas na validação ({{accepted_errors}})';
  END IF;
END $$;

INSERT INTO public.{{target_table}} (id, {{column1}}, {{column2}}, created_at)
SELECT id::uuid, {{column1}}, {{column2}}::{{type2}}, now()
FROM {{staging_table}}
WHERE _import_status = 'insert';

UPDATE public.{{target_table}} t
SET {{column1}} = s.{{column1}},
    {{column2}} = s.{{column2}}::{{type2}},
    updated_at = now()
FROM {{staging_table}} s
WHERE t.id = s.id::uuid AND s._import_status = 'update';

-- 6. CONFERÊNCIA ---------------------------------------------------------------------
SELECT _import_status AS operation, count(*) AS rows
FROM {{staging_table}} GROUP BY _import_status ORDER BY _import_status;

SELECT _row_number, id, {{column1}}, _import_error
FROM {{staging_table}} WHERE _import_status IN ('error', 'duplicate')
ORDER BY _row_number;

-- A tabela TEMP some no fim da sessão; o DROP explícito deixa a intenção clara.
DROP TABLE IF EXISTS {{staging_table}};
