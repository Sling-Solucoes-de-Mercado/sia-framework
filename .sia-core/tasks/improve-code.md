---
id: improve-code
title: Melhorar a qualidade do código
agent: dev
hat: dev
elicit: true
inputs:
  - 'caminho (obrigatório): arquivo ou diretório a analisar'
  - 'opções (opcional): --refactor, --patterns, --preview, --auto-fix, --apply {id}, --apply-all, --dry-run, --threshold, --limit, --exclude, --recursive, --report {arquivo}'
outputs:
  - 'Lista de melhorias (imp-n) e refatorações (ref-n) com local, confiança ou impacto'
  - 'Mudanças aplicadas e validadas, em commit local refactor: ... [Story {storyId}]'
  - 'Relatório opcional no arquivo indicado em --report'
next: [run-tests, tech-debt]
source: [dev-improve-code-quality.md, dev-suggest-refactoring.md]
---

# Melhorar a qualidade do código

## Objetivo

Encontrar e aplicar, com segurança, melhorias de qualidade (formatação, lint, sintaxe moderna, nomes, tratamento de erros, tipos) e refatorações (extrair, simplificar, consolidar) sem mudar o comportamento do código.

## Quando usar

- Limpeza de um arquivo ou módulo dentro de uma story, ou análise de dívida antes de planejar uma story.
- Revisão de oportunidades de refatoração com impacto medido.
- Não use para: corrigir achados do QA (`*apply-qa-fixes`), otimizar desempenho (`*optimize-performance`), mudar comportamento ou escopo.

## Parâmetros

| Parâmetro | Padrão | Uso |
|-----------|--------|-----|
| `{caminho}` | obrigatório | Arquivo ou diretório (`.js`, `.jsx`, `.ts`, `.tsx`) |
| `--refactor` | desligado | Inclui a análise de refatoração (padrões `ref-*`) |
| `--patterns a,b` | ver tabelas | Restringe os padrões analisados |
| `--preview` / `--dry-run` | desligado | Só mostra o que mudaria; não aplica nada |
| `--auto-fix` | desligado | Aplica todas as melhorias com confiança ≥ limiar |
| `--apply {id}` | | Aplica uma sugestão específica, após confirmação |
| `--apply-all` | desligado | Aplica todas as refatorações, após confirmação |
| `--threshold` | 0.8 (melhorias) · 3 (refatorações) | Confiança mínima de 0 a 1; impacto mínimo de 1 a 10 |
| `--limit` | 10 | Máximo de refatorações sugeridas por arquivo |
| `--exclude a,b` | | Padrões de arquivo a ignorar (ex.: `*.test.ts`) |
| `--recursive` | desligado | Inclui subdiretórios |
| `--report {arquivo}` | | Grava o relatório (`.md`, ou `.json` se a extensão pedir) |

Sem `--preview`, `--auto-fix`, `--apply` ou `--apply-all`, o modo é interativo: o usuário escolhe por número o que aplicar.

Padrões de melhoria (padrão: `formatting`, `linting`, `modern-syntax`, `imports`, `naming`):

| Padrão | O que faz |
|--------|-----------|
| `formatting` | Formatação com a ferramenta do projeto (ex.: Prettier) |
| `linting` | Correções e conformidade com as regras do linter (ex.: ESLint) |
| `modern-syntax` | Atualização para sintaxe moderna (ES6+) |
| `imports` | Organização de imports; imports absolutos com `@/` (Artigo VI) |
| `dead-code` | Remoção de código inalcançável ou sem uso |
| `naming` | Nomes alinhados às convenções do projeto |
| `error-handling` | Padrões de tratamento de erro |
| `async-await` | Conversão de cadeias de Promise para async/await |
| `type-safety` | Anotações e segurança de tipos |
| `documentation` | JSDoc/TSDoc em lógica complexa |

Padrões de refatoração (com `--refactor`; padrão: todos):

| Padrão | O que faz |
|--------|-----------|
| `extract_method` | Quebra métodos longos em menores |
| `extract_variable` | Extrai expressões complexas para variáveis com nome |
| `introduce_parameter_object` | Agrupa parâmetros relacionados num objeto |
| `replace_conditional` | Troca condicionais extensos por polimorfismo ou mapa |
| `inline_temp` | Elimina variável temporária de uso único |
| `remove_dead_code` | Remove código inalcançável |
| `consolidate_duplicates` | Extrai código duplicado |
| `simplify_conditionals` | Achata condicionais aninhados |
| `replace_magic_numbers` | Troca números mágicos por constantes |
| `decompose_class` | Divide classes grandes |

## Pré-condições

- [ ] O caminho existe e contém arquivos elegíveis.
- [ ] Para aplicar mudanças: story associada em `InProgress` (Artigo III). Sem story, emita WARN, ofereça só a análise (`--preview` ou `--report`) e aplique apenas com confirmação explícita do usuário, registrando a decisão.
- [ ] Ponto de restauração antes de aplicar: árvore git limpa, commit ou `git stash`. Sem git, copie os arquivos afetados para `.sia/backups/improve-code/{AAAAMMDD-HHmmss}/`.

## Passos

### 1. Validar parâmetros e escopo

1. Liste os arquivos elegíveis. Ignore `node_modules`, `dist/`, `build/` e arquivos minificados (`.min.`); arquivos de teste (`.test.`, `.spec.`) ficam de fora, salvo pedido explícito.
2. Valide os limiares (confiança de 0 a 1; impacto de 1 a 10). Fora da faixa: erro com a faixa válida.
3. Carregue as convenções do projeto (`docs/architecture/coding-standards.md`, configurações do linter e do formatador) para que as sugestões respeitem o padrão existente.

### 2. Analisar

Para cada arquivo e padrão selecionado:

1. Use as ferramentas do projeto quando existirem (linter, formatador, `tsc`) e a leitura do código para o resto.
2. Melhorias: atribua confiança de 0 a 1 e descarte as abaixo do limiar.
3. Refatorações: atribua impacto de 1 a 10 e prioridade (alta, média, baixa); descarte as abaixo do limiar e mantenha no máximo `--limit` por arquivo.
4. Para cada refatoração, conte as referências ao símbolo afetado (grep no projeto) e classifique o risco: LOW (menos de 5), MEDIUM (5 a 15), HIGH (mais de 15).
5. Dê ids sequenciais (`imp-1`, `ref-1`) e registre arquivo, linhas, detalhes e prévia (antes e depois) ou ação sugerida.

### 3. Apresentar

Agrupe por arquivo e mostre estatísticas por padrão (total e confiança média) e por prioridade (total e impacto médio):

```text
src/auth/session.ts
  imp-1 [modern-syntax] Converter cadeia de .then() em async/await
        Confiança: 92% · Linhas 40-58
        - fetchUser().then((u) => ...)
        + const user = await fetchUser()
  ref-1 [ALTA] [extract_method] validateSession tem 85 linhas
        Impacto: ████████░░ 8/10 · Linhas 12-97 · Referências: 7 (MEDIUM)
        Ação: extrair checkExpiry() e checkScopes()
```

Em `--preview` ou `--dry-run`, termine aqui com os próximos passos: aplicar tudo (`--auto-fix`), escolher (`*improve-code {caminho}`), aplicar uma (`--apply {id}`) ou gerar relatório (`--report`).

### 4. Escolher o que aplicar

**Ponto de elicitação:** conforme o modo:

- Interativo (padrão): por arquivo, liste as sugestões numeradas, já marcando as de confiança ≥ 0.9 ou impacto ≥ 7, e peça os números a aplicar.
- `--auto-fix`: todas as melhorias com confiança ≥ limiar, sem perguntar.
- `--apply {id}`: mostre a sugestão e peça confirmação (1. Aplicar, 2. Cancelar).
- `--apply-all`: mostre o resumo por tipo e peça confirmação (padrão: não). Recusou: caia na escolha numerada, com as de impacto ≥ 7 pré-marcadas.

### 5. Aplicar com segurança

1. Aplique de forma incremental: um arquivo ou uma refatoração por vez, começando pelos padrões mais seguros (formatação) e indo para os mais complexos.
2. Depois de cada mudança, valide a sintaxe (`typecheck` ou `build`), o lint e os testes relacionados.
3. Mudança que quebra algo: reverta só ela (`git restore {arquivo}` ou cópia do backup), marque como falha e siga.
4. Preserve o comportamento. Não remova validação, autenticação, autorização ou checagem de segurança como "código morto" e não altere contratos públicos sem ADR (`*create-adr`).

### 6. Validar e registrar

1. Rode os `quality.scripts` do core-config (`lint`, `typecheck`, `test`, `build`); ausentes são registrados. O resultado dos testes deve ser o mesmo de antes da mudança.
2. Revise o diff (`git diff`) antes de commitar.
3. Commit local: `refactor: {resumo} [Story {storyId}]` (formatação pura: `style: ... [Story {storyId}]`).
4. Atualize a File List e o `### Log de debug` da story.
5. Com `--report`: grave o resumo (arquivos analisados, sugestões, aplicadas, falhas, estatísticas por padrão e por arquivo) e a lista completa com a marca de aplicada.
6. Sugestão relevante que não foi aplicada: ofereça registrar com `*tech-debt`.

## Saída

- Lista de sugestões apresentada (e no relatório, quando pedido).
- Mudanças aplicadas, validadas e commitadas localmente, com File List da story atualizada.
- Resumo: aplicadas, falhas e revertidas, próximos passos.

## Critérios de conclusão

- [ ] Sugestões filtradas pelo limiar e agrupadas por arquivo
- [ ] Nada aplicado sem ponto de restauração e sem a escolha ou confirmação exigida pelo modo
- [ ] Cada mudança validada; as que quebraram foram revertidas
- [ ] `quality.scripts` existentes passando e comportamento preservado
- [ ] Commit local com `[Story {storyId}]` e File List atualizada (quando houve mudança)

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Caminho inexistente ou sem arquivos elegíveis | Informe "nenhum arquivo para analisar" e encerre |
| Limiar fora da faixa | Erro com a faixa válida (0 a 1; 1 a 10) |
| Falha ao analisar um arquivo | Avise e siga com os demais |
| Sem story para aplicar mudanças | WARN do Artigo III; aplique só com confirmação |
| Mudança quebra build, lint ou teste | Reverta a mudança e marque como falha |
| Id de sugestão não encontrado | Refaça a análise do caminho; persistindo, informe o erro |

## Handoff

Próximo passo: `*run-tests` para conferir o estado geral. Sugestões não aplicadas: `*tech-debt`.
