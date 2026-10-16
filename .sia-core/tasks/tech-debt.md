---
id: tech-debt
title: Registrar débito técnico
agent: dev
hat: dev
elicit: true
inputs:
  - 'título (obrigatório): uma linha, de 10 a 100 caracteres'
  - 'descrição (opcional): até 500 caracteres; o que melhorar, por quê e onde'
  - 'valor e risco (opcional): de 1 a 3 cada; a prioridade é valor × risco'
  - 'storyId (opcional): story em que o débito foi identificado ou introduzido'
  - 'esforço, área de impacto, tags e critérios de sucesso (opcionais)'
outputs:
  - 'Item [{storyId}-T{n}] ou [BL-T{n}] em docs/stories/backlog.md, na seção da prioridade, com status IDEA'
depends_on:
  tasks: [manage-backlog.md]
next: [backlog]
source: [dev-backlog-debt.md]
---

# Registrar débito técnico

## Objetivo

Registrar no backlog um item de débito técnico (tipo `tech-debt`, letra T), no formato do backlog definido em `manage-backlog.md` (seção "Formato do backlog"), para o `@pm` [Product Owner] aprovar, priorizar e transformar em trabalho.

## Quando usar

- Durante a implementação ou a correção, ao encontrar dívida que não cabe no escopo da story.
- Sugestão relevante não aplicada em `*improve-code` ou `*optimize-performance`.
- Item de gate `CONCERNS` ou `WAIVED` que o `@dev` precisa deixar rastreado.

Registre quando houver:

- duplicação em 3 ou mais arquivos;
- falta de teste em caminho crítico;
- valor fixo que deveria ser configurável;
- nome que esconde a intenção;
- acoplamento que impede testar;
- gargalo de desempenho;
- padrão inseguro.

Não registre: preferência de estilo, otimização prematura, "eu faria diferente" ou a complexidade normal da regra de negócio.

## Pré-condições

- [ ] Título definido (sem título, não há registro).

## Passos

### 1. Coletar os dados

**Ponto de elicitação:** pergunte o que faltar nos argumentos, em lista numerada:

1. Título (10 a 100 caracteres). Ex.: "Extrair acesso a dados do AuthService para um repository".
2. Descrição (até 500 caracteres): o que precisa melhorar, por que é débito e quais arquivos e funções envolve.
3. Valor (benefício de pagar o débito): 1 pequeno, 2 moderado, 3 grande (destrava trabalho, elimina bugs recorrentes).
4. Risco (dano de não pagar): 1 baixo (refatoração desejável), 2 médio (problema relevante de manutenção), 3 alto (risco de segurança, de corromper dados ou de bloquear trabalho futuro).
5. Story relacionada (opcional). Ex.: `2.1`.
6. Esforço estimado (opcional; padrão "a definir"). Ex.: "4 horas", "2 dias".
7. Área de impacto (opcional). Ex.: "autenticação".
8. Tags (opcional, separadas por vírgula). Sugestões: `refactoring`, `architecture`, `testing`, `performance`, `security`, `duplication`, `coupling`, `naming`, `documentation`.
9. Critérios de sucesso (opcional): como saber que o débito foi pago.

Seja honesto na nota: nem todo débito é crítico.

### 2. Calcular a prioridade e o id

1. Prioridade = valor × risco:

   | Valor × risco | Prioridade |
   |---------------|------------|
   | 9 | 🔴 Crítica |
   | 6 | 🟠 Alta |
   | 3 ou 4 | 🟡 Média |
   | 1 ou 2 | 🟢 Baixa |

   Valor ou risco ausente ou fora de 1 a 3: use 2 para o que faltar (Média) e avise.
2. Story informada: confirme que existe (`docs/stories/{storyId}-*.story.md`). Não encontrada: avise e siga sem o vínculo.
3. Id, sequencial por story e tipo:
   - com story: `[{storyId}-T{n}]`, com `n` = maior `T` já usado nessa story + 1 (ex.: `[2.1-T1]`);
   - sem story: `[BL-T{n}]`, com `n` = maior `BL-T` existente + 1.
4. Área informada: acrescente a tag `area:{área}`.

### 3. Gravar no backlog

1. Leia `docs/stories/backlog.md`. Ausente: crie com a estrutura do contrato (cabeçalho, `## Resumo` e as seções `## 🔴 Crítica`, `## 🟠 Alta`, `## 🟡 Média` e `## 🟢 Baixa`) e avise o `@pm`.
2. Acrescente o item ao final da seção da prioridade calculada:

```markdown
### [2.1-T1] Extrair acesso a dados do AuthService para um repository
- **Tipo:** tech-debt
- **Origem:** @dev *tech-debt durante a story 2.1 (src/features/auth/services/auth.service.ts)
- **Story relacionada:** 2.1
- **Valor × risco:** 3 × 2 = 6
- **Esforço:** 4 horas
- **Status:** IDEA
- **Sprint/onda:** —
- **Responsável:** @dev
- **Tags:** coupling, testing, area:autenticação
- **Descrição:** o AuthService consulta o banco direto, o que impede teste unitário e duplica consultas no CheckoutService.
- **Critérios de sucesso:**
  - [ ] Acesso a dados isolado em UserRepository
  - [ ] AuthService testado com o repository mockado
```

3. Sem story: `Story relacionada: —`. Sem critérios informados: um critério derivado da descrição.
4. Em `## Resumo`, some 1 nas colunas IDEA e Total da linha da prioridade e atualize a linha do cabeçalho (`> Atualizado em {AAAA-MM-DD} por @dev (Davi) [Desenvolvimento]`).
5. Não reordene nem reformate o restante do arquivo.

### 4. Resumir

```text
🔧 Débito técnico registrado: [2.1-T1]
Título: Extrair acesso a dados do AuthService para um repository
Prioridade: 🟠 Alta (3 × 2 = 6) · Status: IDEA · Esforço: 4 horas
Próximo: @pm *backlog prioritize (aprovação e priorização)
```

Prioridade Crítica: acrescente o alerta "DÉBITO CRÍTICO: trate logo para não bloquear trabalho futuro".

## Saída

Um item novo em `docs/stories/backlog.md`, na seção da prioridade, no formato do contrato do backlog (tipo `tech-debt`, id com a letra T, valor × risco, status `IDEA`), com o `## Resumo` atualizado, mais o resumo ao usuário.

## Critérios de conclusão

- [ ] Título válido; valor e risco de 1 a 3; prioridade conforme a tabela
- [ ] Id `[{storyId}-T{n}]` ou `[BL-T{n}]` sem repetir id existente
- [ ] Item na seção da prioridade, com todos os campos do contrato e status `IDEA`
- [ ] `## Resumo` e linha de atualização coerentes; resto do arquivo intocado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Sem título | Peça o título; sem ele, não registre |
| Título fora de 10 a 100 caracteres | Peça para ajustar |
| Valor ou risco inválido | Use 2 para o que faltar (Média) e avise |
| Story não encontrada | Avise e registre como `[BL-T{n}]`, sem o vínculo |
| Backlog inexistente | Crie com a estrutura do contrato e avise o `@pm` |
| Seção da prioridade ausente | Crie a seção na ordem Crítica, Alta, Média, Baixa |
| Backlog fora do formato do contrato | Não reestruture; acrescente o item ao final e avise o `@pm` |

## Handoff

Próximo passo: `@pm *backlog prioritize` para aprovar (`IDEA` → `TODO`) e priorizar o item. O débito pode virar story de refatoração (`@pm *create-story`) ou ser tratado junto de trabalho relacionado.
