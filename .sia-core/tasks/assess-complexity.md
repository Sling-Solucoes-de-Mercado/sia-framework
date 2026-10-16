---
id: assess-complexity
title: Avaliar a complexidade da story
agent: dev
hat: architect
elicit: false
inputs:
  - 'storyId (obrigatório): id da story, ex.: 2.1'
  - 'complexidade (opcional): --complexity=SIMPLE|STANDARD|COMPLEX para sobrescrever o resultado calculado'
outputs:
  - 'docs/stories/{storyId}/spec/complexity.json'
depends_on: {}
next: [research-deps, write-spec]
source: [spec-assess-complexity.md]
---

# Avaliar a complexidade da story

## Objetivo

Fase 2 do Spec Pipeline: pontuar a complexidade de uma story em 5 dimensões, classificá-la em SIMPLE, STANDARD ou COMPLEX e definir quais fases do pipeline ela precisa.

## Quando usar

- Depois de `@pm *gather-requirements {storyId}` (fase 1), com `requirements.json` pronto.
- Não use para: medir o impacto de uma mudança pontual (`*analyze-impact`).
- A avaliação é determinística: as mesmas entradas devem gerar a mesma classe.

## Pré-condições

- [ ] `docs/stories/{storyId}/spec/requirements.json` existe e é JSON válido.
- [ ] O arquivo tem ao menos um requisito funcional.

## Dimensões (nota de 1 a 5)

| Nota | Escopo (arquivos afetados) | Integração | Infraestrutura | Conhecimento | Risco |
|------|----------------------------|------------|----------------|--------------|-------|
| 1 | 1 a 2 arquivos, mudança localizada | Nenhuma integração externa | Nenhuma mudança | Padrões existentes no código | Baixo, feature isolada |
| 2 | 3 a 5 arquivos, um módulo | 1 API interna existente | Configuração simples (variáveis de ambiente) | Tecnologia conhecida, padrão novo | Moderado, afeta poucos usuários |
| 3 | 6 a 10 arquivos, vários módulos | 1 a 2 APIs externas ou API interna nova | Dependência ou serviço novo | Biblioteca nova com documentação clara | Médio, feature importante |
| 4 | 11 a 20 arquivos, transversal | 3 ou mais APIs ou integração complexa (webhooks, eventos) | Mudança de banco ou de schema | Tecnologia nova para o time | Alto, afeta muitos usuários |
| 5 | Mais de 20 arquivos, arquitetura inteira | Orquestração de vários sistemas | Infraestrutura nova (servidor, container) | Domínio desconhecido, exige pesquisa | Crítico, núcleo do sistema |

## Classes

| Classe | Total | Fases do pipeline | Esforço típico |
|--------|-------|-------------------|----------------|
| SIMPLE | até 8 | `gather`, `spec`, `critique` | menos de 1 dia |
| STANDARD | 9 a 15 | `gather`, `assess`, `research`, `spec`, `critique`, `plan` | 1 a 3 dias |
| COMPLEX | 16 ou mais | `gather`, `assess`, `research`, `spec`, `critique_1`, `revise`, `critique_2`, `plan` | 3 dias ou mais |

COMPLEX recebe os alertas: exige revisão arquitetural; considere quebrar em stories menores; pode precisar de um spike.

## Passos

### 1. Carregar os requisitos

Leia `docs/stories/{storyId}/spec/requirements.json` (requisitos funcionais, não funcionais, restrições) e a story.

### 2. Analisar o código

1. **Arquivos afetados:** a partir dos requisitos funcionais, identifique componentes e módulos citados, procure os arquivos relacionados (grep/glob) e conte os únicos.
2. **Padrões:** extraia os conceitos-chave e procure implementações parecidas; avalie o quanto dá para reaproveitar.
3. **Integrações:** liste serviços externos pedidos, compare com as integrações existentes e identifique as conexões novas e as exigências de autenticação.
4. **Infraestrutura e risco:** veja se há mudança de banco, serviço novo ou impacto no deploy; avalie impacto no usuário, implicações de segurança e reversibilidade.

### 3. Pontuar as dimensões

Para cada dimensão (`scope`, `integration`, `infrastructure`, `knowledge`, `risk`), aplique a tabela, atribua a nota de 1 a 5 e escreva a justificativa em uma frase.

### 4. Calcular a classe

```text
total = scope + integration + infrastructure + knowledge + risk
override informado → classe = override
senão, total ≤ 8 → SIMPLE; total ≤ 15 → STANDARD; senão → COMPLEX
```

Com override diferente da classe calculada, siga com o override, marque `overridden: true` e registre em `flags` a classe calculada (ex.: `override: calculado STANDARD (13)`).

### 5. Gravar `complexity.json`

Grave `docs/stories/{storyId}/spec/complexity.json`:

```json
{
  "storyId": "2.1",
  "assessedAt": "2026-10-16T10:30:00-03:00",
  "assessedBy": "@dev (Davi) [Arquitetura]",
  "result": "STANDARD",
  "overridden": false,
  "dimensions": {
    "scope": { "score": 3, "notes": "módulo de auth, página de login e serviço de usuários" },
    "integration": { "score": 3, "notes": "API OAuth do Google" },
    "infrastructure": { "score": 2, "notes": "variáveis de ambiente das credenciais OAuth" },
    "knowledge": { "score": 2, "notes": "padrão OAuth já existe no código" },
    "risk": { "score": 3, "notes": "afeta o login de todos os usuários" }
  },
  "totalScore": 13,
  "pipelinePhases": ["gather", "assess", "research", "spec", "critique", "plan"],
  "flags": [],
  "estimatedEffort": "1 a 3 dias"
}
```

Regras do formato: obrigatórios `storyId`, `assessedAt` (ISO-8601), `result` (`SIMPLE`, `STANDARD` ou `COMPLEX`), `dimensions` (as 5, cada uma com `score` inteiro de 1 a 5 e `notes`), `totalScore` (inteiro de 5 a 25) e `pipelinePhases`. Opcionais: `assessedBy`, `overridden`, `flags`, `estimatedEffort`.

### 6. Apresentar

```text
Complexidade da story 2.1
Escopo 3 · Integração 3 · Infraestrutura 2 · Conhecimento 2 · Risco 3
Total: 13 → STANDARD (1 a 3 dias)
Fases: gather → assess → research → spec → critique → plan
Arquivo: docs/stories/2.1/spec/complexity.json
```

## Saída

`docs/stories/{storyId}/spec/complexity.json` no formato acima e o resumo da classificação.

## Critérios de conclusão

- [ ] As 5 dimensões pontuadas de 1 a 5, cada uma com justificativa
- [ ] Total e classe coerentes com as faixas (ou override registrado em `flags`)
- [ ] Fases e esforço típico conforme a classe
- [ ] JSON válido gravado em `docs/stories/{storyId}/spec/`

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `requirements.json` ausente | PARE: rode antes `@pm *gather-requirements {storyId}` |
| Nenhum requisito funcional | PARE: não há o que avaliar |
| `requirements.json` inválido | PARE e aponte o erro de sintaxe |
| Override muito diferente do calculado | Avise, siga com o override e registre a classe calculada em `flags` |

## Handoff

STANDARD ou COMPLEX: `@pm *research-deps {storyId}` (fase 3). SIMPLE: `@pm *write-spec {storyId}` (fase 4).
