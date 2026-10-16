# Checklist: Design de Banco de Dados

> Usado por: `@dev` [Dados] em `*db-checklist` e no passo 10 da task `db-domain-modeling` (`*db-model`).
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: Antes de começar, carregue o design do schema (docs/architecture/schema-design.md) e a migration correspondente; num banco existente, use também supabase/docs/SCHEMA.md e supabase/docs/DB-AUDIT.md. Revise o design inteiro antes de marcar itens: um bom design evita problemas caros de corrigir depois. Marque cada item como ✅ feito, ❌ não feito ou N/A, com um comentário curto em todo ❌ e N/A explicando a decisão ou o risco. Aponte trade-offs e considere os requisitos atuais e os previsíveis. Corretude primeiro, otimização depois.]]

## 1. Alinhamento com o domínio
[[LLM: O schema precisa refletir as regras de negócio.]]
- [ ] Todas as entidades do modelo de domínio estão representadas
- [ ] Os relacionamentos refletem a lógica de negócio
- [ ] Cardinalidade (1:1, 1:N, M:N) implementada corretamente
- [ ] Regras de negócio aplicáveis no banco estão em constraints ou triggers
- [ ] Nomes consistentes e significativos

## 2. Tabelas
[[LLM: As tabelas são a fundação. Confira cada uma.]]
- [ ] Toda tabela tem chave primária (UUID de preferência)
- [ ] `created_at` e `updated_at` em todas as tabelas
- [ ] Soft delete (`deleted_at`) onde é preciso preservar histórico
- [ ] Tipo adequado para cada coluna (`timestamptz`, `jsonb`, `text`, `numeric`)
- [ ] Nomes de coluna em snake_case

## 3. Relacionamentos e constraints
[[LLM: Constraints protegem a integridade dos dados.]]
- [ ] FK definida para todo relacionamento
- [ ] Comportamento em DELETE definido (CASCADE, SET NULL ou RESTRICT)
- [ ] Unique nas chaves de negócio
- [ ] CHECK para validação de valores
- [ ] NOT NULL nos campos obrigatórios

## 4. Índices
[[LLM: Índices sustentam o desempenho. Cada um precisa de justificativa.]]
- [ ] Chave primária indexada (automático)
- [ ] Toda FK com índice
- [ ] Colunas consultadas com frequência indexadas, inclusive as usadas em policies RLS
- [ ] Índices compostos para os padrões de consulta comuns
- [ ] Sem excesso de índices (cada um com justificativa)

## 5. Normalização e desnormalização
[[LLM: Equilibre normalização e necessidade prática.]]
- [ ] 3FN no mínimo
- [ ] Desnormalizações documentadas e justificadas
- [ ] Nenhuma redundância de dado sem motivo explícito
- [ ] Anomalias de atualização evitadas
- [ ] Anomalias de exclusão evitadas

## 6. Segurança
[[LLM: Segurança entra no desenho, não depois dele.]]
- [ ] Tabelas classificadas por sensibilidade
- [ ] Estratégia de RLS definida para cada tabela exposta pela API
- [ ] Colunas sensíveis identificadas (dados pessoais, credenciais)
- [ ] Requisitos de auditoria definidos
- [ ] Padrões de acesso documentados

## 7. Desempenho
[[LLM: Desenhe para a escala e os padrões de acesso esperados.]]
- [ ] Volume de dados estimado
- [ ] Padrões de consulta identificados e atendidos
- [ ] Particionamento avaliado (tabelas grandes)
- [ ] Arquivamento de dados antigos avaliado
- [ ] Proporção entre leitura e escrita considerada

## 8. Documentação
[[LLM: Outras pessoas precisam entender o desenho.]]
- [ ] Diagrama ER criado
- [ ] Propósito de cada tabela documentado
- [ ] Relacionamentos complexos explicados
- [ ] Decisões de desenho registradas (as estruturais em ADR)
- [ ] COMMENT ON previsto para o schema de produção

## Resultado
| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Alinhamento com o domínio | | |
| 2. Tabelas | | |
| 3. Relacionamentos e constraints | | |
| 4. Índices | | |
| 5. Normalização | | |
| 6. Segurança | | |
| 7. Desempenho | | |
| 8. Documentação | | |

[[LLM: Resumo final: descreva o design em poucas linhas, liste os itens ❌ com a explicação, registre os trade-offs e os pontos que pedem atenção futura, e diga se o design está pronto para virar migration.]]

**Decisão:** PRONTO PARA IMPLEMENTAR quando não houver ❌ sem justificativa aceita pelo usuário. Caso contrário, NÃO PRONTO: volte ao passo correspondente do `*db-model`.
