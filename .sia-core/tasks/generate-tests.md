---
id: generate-tests
title: Gerar testes
agent: dev
hat: dev
elicit: true
inputs:
  - 'alvo (obrigatório): storyId (ex.: 2.1) ou caminho de arquivo ou diretório'
  - 'opções (opcional): --test-type unit|integration|e2e|all, --coverage-target, --framework, --mock-level minimal|moderate|extensive, --quality-level basic|standard|comprehensive, --update-existing, --output-dir'
outputs:
  - 'Arquivos de teste criados ou atualizados, rodando e passando (ou falhando por defeito real, reportado)'
  - 'File List e seção Testes da story atualizadas; commit local test: ... [Story {storyId}]'
depends_on:
  data: [test-levels-framework.md]
next: [run-tests]
source: [qa-generate-tests.md, create-suite.md]
---

# Gerar testes

## Objetivo

Gerar uma suíte de testes a partir dos critérios de aceite da story e do test design (ou da análise de um caminho de código), no nível certo, em ordem de prioridade e sem sobrescrever testes existentes.

## Quando usar

- `*generate-tests {storyId}`: cobrir os critérios de aceite de uma story, usando o test design do `@pm` [Qualidade] quando existir.
- `*generate-tests {caminho}`: cobrir código sem testes ou com cobertura baixa.
- Não use para: rodar os gates (`*run-tests`) nem desenhar a estratégia de testes da story (`@pm *test-design`).

## Parâmetros

| Opção | Padrão | Uso |
|-------|--------|-----|
| `--test-type` | `unit` | `unit`, `integration`, `e2e` ou `all` |
| `--coverage-target` | 80 | Cobertura alvo, de 0 a 100 |
| `--framework` | o do projeto | `vitest`, `jest` ou `mocha`; detectado pelo `package.json` |
| `--mock-level` | `moderate` | `minimal` (só dependências externas), `moderate` (externas e até 3 internas, parcialmente), `extensive` (todas) |
| `--quality-level` | `standard` | Densidade de asserções por teste: `basic` 2, `standard` 4, `comprehensive` 6 |
| `--update-existing` | desligado | Permite atualizar arquivos de teste existentes |
| `--output-dir` | convenção do projeto | Pasta de saída dos testes |

## Pré-condições

- [ ] Alvo existente: story em `docs/stories/{storyId}-*.story.md` ou caminho válido.
- [ ] Framework de testes configurado no projeto. Ausente: não instale por conta própria; proponha e aguarde aprovação (dependência nova).
- [ ] Para gravar arquivos: story associada em `InProgress` (Artigo III). Sem story, emita WARN e grave só com confirmação explícita, registrando a decisão.

## Passos

### 1. Reunir as fontes

- **Story:** leia os critérios de aceite (Dado/Quando/Então), as tasks e a File List.
- **Test design:** se existir `docs/qa/assessments/{storyId}-test-design-*.md` (o mais recente), use seus cenários: id (`{storyId}-{UNIT|INT|E2E}-{seq}`), nível, prioridade (P0 a P3) e justificativa.
- **Caminho:** liste os arquivos-alvo e localize testes existentes pelas convenções do projeto (`*.test.*`, `*.spec.*`, `__tests__/`, `tests/`).
- **Níveis:** siga `data/test-levels-framework.md`: prefira unitário para lógica pura; integração para interação entre componentes; e2e só para jornadas críticas. Aplique a guarda de cobertura duplicada (não teste no nível de cima o que já está coberto no de baixo).

### 2. Analisar os alvos

Para cada arquivo ou critério:

1. Complexidade: baixa, média ou alta (tamanho, número de funções e de desvios condicionais).
2. Dependências internas (imports relativos) e externas (pacotes, APIs, banco).
3. Funções e métodos públicos testáveis (ignore os privados, com prefixo `_`).
4. Casos de borda: nulo ou indefinido, coleções vazias, tratamento de erro, falha em operação assíncrona.
5. Mocks necessários conforme `--mock-level`.

### 3. Planejar a suíte

1. Para cada critério de aceite, ao menos um teste: Dado → preparação, Quando → ação, Então → asserção.
2. Unitários: por função, um caso de sucesso e um de erro, mais um teste por caso de borda.
3. Integração: só quando há dependências relevantes (pule para alvo de complexidade baixa sem dependências).
4. E2E: só para fluxos completos do usuário.
5. Ordem de criação: primeiro os auxiliares compartilhados (builders, fixtures, mocks), depois unitários, integração e e2e; dentro de cada nível, P0 antes de P1, P2 e P3.
6. Nomeie os testes com o id do cenário quando houver (ex.: `it('2.1-UNIT-001: rejeita e-mail inválido', ...)`), para a rastreabilidade do `@pm *trace`.
7. Caminho de cada arquivo: convenção do projeto ou `--output-dir`. Arquivo já existente: só com `--update-existing`; senão, marque como "pulado".

### 4. Prévia e confirmação

**Ponto de elicitação:** mostre o plano e peça confirmação.

```text
Plano de testes: story 2.1
Alvos: 3 · Arquivos de teste: 4 (1 auxiliar, 2 unit, 1 integration) · Testes: 17
Cobertura alvo: 80% · Nível de qualidade: standard · Mocks: moderate
1. tests/builders/user.builder.ts (auxiliar)
2. src/auth/session.test.ts (unit, P0: 2.1-UNIT-001..004)
3. src/auth/token.test.ts (unit, P1)
4. tests/integration/login.test.ts (integration, P0: 2.1-INT-001)
Pulados: src/auth/index.test.ts (já existe; use --update-existing)
1. Gerar  2. Ajustar o plano  3. Cancelar
```

### 5. Gerar

1. Crie os arquivos na ordem do plano, com preparação e limpeza (`beforeEach`/`afterEach`) adequadas e descrições que explicam o comportamento esperado.
2. Código sintaticamente válido, sem dado sensível real e com caminhos validados (nada fora do projeto).
3. Geração atômica: se a criação de um arquivo falhar, remova os arquivos criados nesta execução e reporte (tudo ou nada).

### 6. Rodar e analisar

1. Rode os testes gerados e depois a suíte completa (`quality.scripts.test`).
2. Teste gerado falhando por erro do próprio teste: corrija o teste. Falhando por defeito real do código: não "conserte" o teste; reporte o defeito (na story ativa ele vira correção do `*develop`).
3. Meça a cobertura quando o projeto permitir e compare com o alvo; abaixo do alvo, liste as lacunas.

### 7. Registrar

1. Story: acrescente os arquivos à File List e resuma em `## Testes` os cenários cobertos e como rodá-los.
2. Commit local: `test: {resumo} [Story {storyId}]`.

## Saída

- Arquivos de teste criados ou atualizados, rodando.
- Resumo: alvos, arquivos gerados e pulados, testes, cobertura obtida contra o alvo e defeitos reais encontrados.
- File List, seção `## Testes` e commit local.

## Critérios de conclusão

- [ ] Todo critério de aceite (e todo cenário P0 do test design) com ao menos um teste
- [ ] Níveis escolhidos conforme `test-levels-framework.md`, sem cobertura duplicada desnecessária
- [ ] Nenhum teste existente sobrescrito sem `--update-existing`
- [ ] Testes gerados rodando; falhas restantes são defeitos reais, reportados
- [ ] File List, `## Testes` e commit local atualizados

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Alvo não encontrado | Informe e sugira alvos parecidos (stories ou caminhos) |
| Opção com valor inválido | Mostre os valores válidos |
| Cobertura alvo fora de 0 a 100 | Erro com a faixa válida |
| Framework ausente ou conflitante | Pare e peça decisão (dependência não aprovada) |
| Falha ao criar um arquivo | Remova os arquivos criados nesta execução e reporte |
| Teste revela defeito real | Não altere o teste para passar; reporte o defeito |

## Handoff

Próximo passo: `*run-tests` para conferir os gates. Defeito encontrado: corrija na story ativa (`*develop {storyId}`).
