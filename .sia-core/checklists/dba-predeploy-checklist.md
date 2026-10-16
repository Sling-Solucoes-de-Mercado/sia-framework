# Checklist: Pré-Deploy de Banco

> Usado por: `@dev` [Dados] no passo 5 da task `db-migrate` (`*db-migrate`), antes de aplicar em staging ou produção.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: Mudanças de banco costumam ser irreversíveis ou caras de corrigir: este checklist garante uma implantação segura. Antes de começar, carregue a migration, o script de rollback, o resultado do dry-run, o plano de migration (se houver) e o supabase/docs/DB-AUDIT.md mais recente. Percorra as seções em ordem. Marque cada item como ✅ feito, ❌ não feito ou N/A, com comentário curto em todo ❌ e N/A. Seja específico sobre o que foi validado e aponte riscos. A segurança da produção vem primeiro.]]

## 1. Validação da migration
[[LLM: A migration precisa ser segura e reversível.]]
- [ ] Testada no ambiente local (`supabase db reset`) e com dry-run no alvo sem erro
- [ ] `supabase db push --dry-run` lista só as migrations esperadas
- [ ] Idempotente onde possível (IF NOT EXISTS, DROP ... IF EXISTS)
- [ ] Sem controle de transação no arquivo e sem comando que exige rodar fora de transação
- [ ] Script de rollback existe para toda mudança de schema
- [ ] Ordem e dependências documentadas
- [ ] Nenhuma operação destrutiva sem salvaguarda explícita (snapshot de dados, backup)

## 2. Revisão do schema
[[LLM: Mudança de schema pode quebrar a aplicação. Confira com cuidado.]]
- [ ] Nenhuma mudança que quebre a versão atual da aplicação (ou expand/contract planejado)
- [ ] FKs definidas corretamente
- [ ] Índice em toda FK e nas colunas consultadas com frequência
- [ ] NOT NULL adequado
- [ ] Defaults definidos onde necessário

## 3. Segurança
[[LLM: Segurança do banco é crítica. Confira cada item.]]
- [ ] RLS habilitada em toda tabela exposta pela API
- [ ] Policies testadas com casos positivos e negativos (`*db-test-as-user`)
- [ ] `*db-audit` sem achado CRÍTICO em aberto
- [ ] Nenhum dado sensível exposto sem autorização; views com `security_invoker`
- [ ] Funções SECURITY DEFINER justificadas, com `search_path` fixo e EXECUTE restrito
- [ ] Nenhuma credencial ou segredo nas migrations

## 4. Desempenho
[[LLM: Problema de desempenho em produção custa caro. Valide.]]
- [ ] Alterações em tabelas grandes planejadas para horário de baixo tráfego
- [ ] Índices novos testados contra as consultas que devem atender
- [ ] Nenhuma varredura completa nova em tabela grande
- [ ] EXPLAIN ANALYZE rodado nas consultas críticas
- [ ] Conexões consideradas (pooler em modo sessão para migrations; `lock_timeout` definido)

## 5. Backup e recuperação
[[LLM: Sempre tenha um caminho de volta.]]
- [ ] Snapshot gravado em `supabase/snapshots/` antes da implantação
- [ ] Procedimento de rollback documentado e testado
- [ ] Tempo estimado de recuperação documentado
- [ ] Backup gerenciado ou PITR do Supabase verificado e acessível

## 6. Documentação
[[LLM: Quem vier depois precisa entender o que mudou.]]
- [ ] COMMENT ON nas tabelas e colunas novas
- [ ] Notas da migration explicam o propósito das mudanças
- [ ] Mudanças que quebram comunicadas ao time
- [ ] `supabase/docs/migration-log.md` pronto para receber a entrada

## Resultado
| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Validação da migration | | |
| 2. Revisão do schema | | |
| 3. Segurança | | |
| 4. Desempenho | | |
| 5. Backup e recuperação | | |
| 6. Documentação | | |

[[LLM: Resumo final: descreva as mudanças a implantar, liste os itens ❌ com a explicação, os riscos e as mitigações, confirme que o rollback está pronto e diga se a implantação deve seguir.]]

**Decisão:** GO quando todos os itens aplicáveis estão ✅ ou com mitigação aceita pelo usuário. NO-GO quando houver qualquer ❌ nas seções 3 (Segurança) ou 5 (Backup e recuperação), ou ❌ sem mitigação nas demais. NO-GO interrompe o `*db-migrate`.
