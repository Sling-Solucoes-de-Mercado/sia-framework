---
id: nfr-assess
title: Avaliar requisitos não funcionais
agent: pm
hat: quality
elicit: true
modes: [yolo, interactive]
inputs:
  - 'storyId: id da story (ex.: 2.1)'
  - 'metas de NFR (opcional): na story, em docs/architecture/ ou em data/technical-preferences.md'
outputs:
  - 'docs/qa/assessments/{storyId}-nfr-{AAAAMMDD}.md com resumo, problemas e o bloco nfr_validation para o gate'
depends_on:
  data: [technical-preferences.md]
next: [qa-gate]
source: [qa-nfr-assess.md]
---

# Avaliar requisitos não funcionais

## Objetivo

Avaliar rapidamente os requisitos não funcionais (NFRs) de uma story, por padrão segurança, desempenho, confiabilidade e manutenibilidade, e gerar um relatório curto com o bloco `nfr_validation` que o `*qa-gate` usa.

## Quando usar

- Antes do `*qa-gate`, em story com risco de segurança, desempenho ou confiabilidade.
- Quando o gate pede revisão profunda.
- É avaliação rápida, não análise exaustiva: pule o que não se aplica.

## Pré-condições

- [ ] storyId informado (story não encontrada não impede a avaliação; ver passo 1)

## Modos

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Avalia os quatro NFRs principais. Meta desconhecida vira `CONCERNS`. |
| Interativo (padrão) | Pergunta quais NFRs avaliar e as metas que faltam. |

## Passos

### 1. Carregar a story

Declare `[Chapéu: Qualidade]` e leia `docs/stories/{storyId}-*.story.md`. Story não encontrada: crie a avaliação mesmo assim, com a nota "Story de origem não encontrada", e marque todos os NFRs selecionados como `CONCERNS` com "Alvo desconhecido / evidência ausente".

### 2. Escolher o escopo

**Ponto de elicitação (Interativo):**

```text
Quais NFRs avaliar? (números separados por vírgula; Enter = 1 a 4)
1. Segurança (padrão)
2. Desempenho (padrão)
3. Confiabilidade (padrão)
4. Manutenibilidade (padrão)
5. Usabilidade
6. Compatibilidade
7. Portabilidade
8. Adequação funcional
```

YOLO: 1 a 4.

### 3. Encontrar as metas

Procure metas nos critérios de aceite da story, em `docs/architecture/*.md` e em `data/technical-preferences.md`.

- Interativo: pergunte as que faltam. Ex.: "Não há meta de desempenho. Qual o tempo de resposta esperado?" → "200 ms nas chamadas de API".
- YOLO: meta ausente vira `CONCERNS` com "Alvo desconhecido".
- Nunca suponha uma meta.

### 4. Avaliar cada NFR

Para cada NFR selecionado: há evidência de implementação? Dá para validar? Há lacuna óbvia? Use também o relatório de inspeção da story (lente segurança), se existir.

| NFR | PASS | CONCERNS | FAIL |
|-----|------|----------|------|
| Segurança | autenticação implementada; autorização aplicada; validação de entrada; nenhum segredo no código | sem limite de tentativas; criptografia fraca; autorização incompleta | sem autenticação; credencial no código; injeção de SQL |
| Desempenho | atende as metas de tempo; nenhum gargalo óbvio; uso razoável de recursos | perto do limite; índice faltando; sem estratégia de cache | estoura o tempo; vazamento de memória; consulta sem otimização |
| Confiabilidade | tratamento de erro; degradação controlada; retry onde precisa | alguns erros sem tratamento; sem circuit breaker; sem health check | nenhum tratamento de erro; quebra em erro; sem recuperação |
| Manutenibilidade | cobertura de testes na meta; código bem estruturado; documentação presente | cobertura abaixo da meta; alguma duplicação; documentação faltando | sem testes; código muito acoplado; sem documentação |

O que checar:

- Segurança: autenticação, autorização, validação de entrada, gestão de segredos, limite de tentativas.
- Desempenho: tempo de resposta, consultas ao banco, uso de cache, consumo de recursos.
- Confiabilidade: tratamento de erro, retry, circuit breaker, health check, logs.
- Manutenibilidade: cobertura de testes, estrutura do código, documentação, dependências.

Os NFRs 5 a 8 seguem a ISO 25010: usabilidade (aprendizado, operação, acessibilidade), compatibilidade (coexistência, interoperabilidade), portabilidade (adaptabilidade, instalação) e adequação funcional (completude, correção, adequação).

### 5. Aplicar as regras de status

- **FAIL:** algum NFR selecionado com lacuna crítica ou meta claramente não atendida.
- **CONCERNS:** nenhum FAIL, mas algum NFR desconhecido, parcial ou sem evidência.
- **PASS:** todos os NFRs selecionados atendem as metas, com evidência.

Nota de qualidade: 100 − 20 por NFR em `FAIL` − 10 por NFR em `CONCERNS`, entre 0 e 100. Pesos definidos em `data/technical-preferences.md` prevalecem.

### 6. Gravar o relatório

Grave em `docs/qa/assessments/{storyId}-nfr-{AAAAMMDD}.md`:

````markdown
# Avaliação de NFR: {storyId}

Data: {AAAA-MM-DD}
Revisor: @pm (Mira) [Qualidade]
<!-- Nota: story de origem não encontrada (quando for o caso) -->

## Resumo
- Segurança: CONCERNS. Sem limite de tentativas no login
- Desempenho: PASS. Resposta abaixo de 200 ms verificada
- Confiabilidade: PASS. Tratamento de erro adequado
- Manutenibilidade: CONCERNS. Cobertura de 65%, meta de 80%
- Nota de qualidade: 80/100

## Problemas críticos
1. **Sem limite de tentativas** (Segurança)
   - Risco: ataque de força bruta
   - Correção: limite de tentativas nos endpoints de autenticação

## Ganhos rápidos
- Limite de tentativas: cerca de 2 horas
- Aumentar a cobertura de testes: cerca de 4 horas

## Bloco para o gate
```yaml
nfr_validation:
  security: { status: CONCERNS, notes: 'Sem limite de tentativas nos endpoints de autenticação' }
  performance: { status: PASS, notes: 'Resposta abaixo de 200 ms verificada' }
  reliability: { status: PASS, notes: 'Tratamento de erro e retry implementados' }
  maintainability: { status: CONCERNS, notes: 'Cobertura de 65%, meta de 80%' }
```
````

O bloco traz só os NFRs avaliados, sem placeholders. Chaves: `security`, `performance`, `reliability`, `maintainability`, `usability`, `compatibility`, `portability`, `functional_suitability`.

### 7. Informar

```text
Avaliação de NFR: docs/qa/assessments/{storyId}-nfr-{AAAAMMDD}.md
Bloco NFR pronto: o *qa-gate {storyId} usa em nfr_validation
```

## Saída

- Relatório em `docs/qa/assessments/{storyId}-nfr-{AAAAMMDD}.md`, com o bloco `nfr_validation`.
- As duas linhas do passo 7 na resposta.

## Critérios de conclusão

- [ ] Relatório gravado no caminho certo, com a data no nome
- [ ] Bloco com só os NFRs avaliados, sem placeholders
- [ ] Meta desconhecida marcada `CONCERNS`, nunca suposta
- [ ] Status de cada NFR conforme o passo 5
- [ ] Cada problema crítico com risco e correção

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story não encontrada | passo 1 |
| Meta ausente | pergunte (Interativo) ou `CONCERNS` (YOLO) |
| NFR não se aplica à story | não selecione; diga no resumo |
| Evidência impossível de obter (ex.: sem ambiente para teste de carga) | `CONCERNS`, com o motivo |

## Handoff

Próximo passo: `@pm *qa-gate {storyId}`.
