-- =============================================================================
-- Template de triggers (chapéu Dados do @dev)
-- Uso: seções "funções" e "triggers" das migrations (sql/migration.sql). Escolha só
--      os blocos necessários. Triggers rodam sozinhos: teste antes de aplicar.
-- Placeholders: {{table_name}}
-- Regras: funções com search_path vazio e nomes qualificados; SECURITY DEFINER só
--      quando precisar escrever em tabela protegida, e no schema private.
-- =============================================================================

-- 1. UPDATED_AT (o mais comum) --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_{{table_name}}_updated_at ON public.{{table_name}};
CREATE TRIGGER trg_{{table_name}}_updated_at
  BEFORE UPDATE ON public.{{table_name}}
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. TRILHA DE AUDITORIA -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users (id),       -- NULL em operações de servidor
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log (changed_at);
-- RLS sem policies: a API não lê nem escreve o log; só o servidor
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER: grava no log mesmo sem o usuário ter acesso à tabela de log
CREATE OR REPLACE FUNCTION private.audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_{{table_name}}_audit ON public.{{table_name}};
CREATE TRIGGER trg_{{table_name}}_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.{{table_name}}
  FOR EACH ROW EXECUTE FUNCTION private.audit_row();

-- 3. VALIDAÇÃO DE REGRA DE NEGÓCIO -------------------------------------------------
CREATE OR REPLACE FUNCTION public.{{table_name}}_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Formato de e-mail
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail inválido: %', NEW.email;
  END IF;
  -- Transição de status proibida
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'Status completed não pode voltar atrás';
  END IF;
  -- Registro com soft delete é somente leitura
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Registro excluído não pode ser alterado';
  END IF;
  -- Valor automático
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_{{table_name}}_validate ON public.{{table_name}};
CREATE TRIGGER trg_{{table_name}}_validate
  BEFORE INSERT OR UPDATE ON public.{{table_name}}
  FOR EACH ROW EXECUTE FUNCTION public.{{table_name}}_validate();

-- 4. SOFT DELETE: DELETE vira UPDATE de deleted_at ------------------------------
-- Genérica: serve para qualquer tabela com id e deleted_at. O UPDATE respeita a RLS
-- de quem excluiu (é preciso ter policy de UPDATE).
CREATE OR REPLACE FUNCTION public.soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  EXECUTE format('UPDATE %I.%I SET deleted_at = now() WHERE id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
  USING OLD.id;
  RETURN NULL;     -- cancela a exclusão física
END;
$$;

DROP TRIGGER IF EXISTS trg_{{table_name}}_soft_delete ON public.{{table_name}};
CREATE TRIGGER trg_{{table_name}}_soft_delete
  BEFORE DELETE ON public.{{table_name}}
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete();

-- 5. NOTIFICAÇÃO DE MUDANÇAS ----------------------------------------------------------
-- No Supabase, prefira o Realtime: ALTER PUBLICATION supabase_realtime ADD TABLE public.{{table_name}};
-- (o Realtime respeita a RLS). Notificação manual, para ouvintes próprios via LISTEN:
CREATE OR REPLACE FUNCTION public.notify_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_notify(
    TG_TABLE_NAME || '_changes',
    json_build_object(
      'operation', TG_OP,
      'record', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
    )::text
  );
  RETURN coalesce(NEW, OLD);
END;
$$;

-- CREATE TRIGGER trg_{{table_name}}_notify
--   AFTER INSERT OR UPDATE OR DELETE ON public.{{table_name}}
--   FOR EACH ROW EXECUTE FUNCTION public.notify_changes();
