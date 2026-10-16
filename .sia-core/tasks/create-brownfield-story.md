---
id: create-brownfield-story
title: Criar story para projeto existente
agent: pm
hat: scrum
elicit: true
modes: [interactive, preflight]
inputs:
  - 'fonte (opcional): saída do *document-project, PRD brownfield, epic, documentação do usuário ou descrição da melhoria'
  - 'epic (opcional): número do epic ao qual a story pertence'
outputs:
  - 'docs/stories/{epic}.{story}-{slug}.story.md com status Draft'
  - 'Handoff em .sia/handoffs/ apontando para *validate-story'
depends_on:
  tasks: [create-story.md]
  templates: [story-tmpl.yaml, agent-handoff-tmpl.yaml]
next: [validate-story, create-brownfield-story]
source: [brownfield-create-story.md, create-brownfield-story.md]
---

# Criar story para projeto existente

## Objetivo

Criar uma story pronta para implementação num sistema existente quando não há PRD e arquitetura fragmentados, ou quando a melhoria é pequena e isolada. A story protege o que já funciona: traz pontos de integração, padrões a seguir, critérios de não regressão, riscos e plano de rollback.

## Quando usar

- Projeto existente com documentação fora do padrão do SIA: saída do `@dev *document-project`, PRD brownfield, epic avulso ou documentação do usuário.
- Melhoria pequena: cabe numa sessão de desenvolvimento (até 4 horas), segue padrões existentes, não exige arquitetura nova e tem integração simples e isolada.
- Não use nestes casos:

| Situação | Use |
|----------|-----|
| PRD e arquitetura fragmentados existem | `@pm *create-story` |
| A melhoria pede 2 ou 3 stories coordenadas, algum design ou vários pontos de integração | `@pm *create-epic` |
| Muitas stories, planejamento de arquitetura ou integração significativa | `@pm *create-brownfield-prd` e `@dev *create-brownfield-architecture` |

## Pré-condições

- [ ] Há uma mudança a fazer, vinda de um documento ou do usuário
- [ ] `templates/story-tmpl.yaml` disponível

## Modos

| Modo | Comportamento nesta task |
|------|--------------------------|
| Interativo (padrão) | Pergunta a cada lacuna de contexto, à medida que aparece. |
| Pre-Flight | Faz todas as perguntas do passo 2 de uma vez; depois escreve a story sem novas perguntas. |

YOLO não se aplica: em sistema existente, é melhor perguntar do que supor.

## Passos

### 1. Verificar a documentação disponível

Procure nesta ordem:

1. PRD e arquitetura fragmentados (`docs/prd/`, `docs/architecture/`). Se existirem:
   **Ponto de elicitação:** "Há documentação fragmentada. 1. Usar `*create-story` (recomendado) 2. Continuar aqui"
2. Documento do sistema existente gerado por `@dev *document-project` (ex.: `docs/brownfield-architecture.md` ou similar): estado real, débito técnico, workarounds.
3. PRD brownfield (`docs/prd.md`), que pode trazer detalhes técnicos.
4. Arquivos de epic (`docs/prd/epic-*.md` ou similar), criados por `*create-epic`.
5. Documentação do usuário: pergunte o local e o formato.

### 2. Identificar a story e reunir o contexto essencial

1. Origem da story:
   - PRD brownfield: a story da seção do epic.
   - Arquivo de epic: a definição e a lista de stories.
   - Direção do usuário: pergunte qual melhoria implementar.
   - Sem origem clara: defina o escopo junto com o usuário.
2. Reúna o mínimo para implementar com segurança:
   - [ ] Funcionalidade existente que pode ser afetada
   - [ ] Pontos de integração com o código atual
   - [ ] Padrões a seguir, com arquivos de exemplo
   - [ ] Stack da área tocada
   - [ ] Restrições técnicas
   - [ ] Armadilhas e workarounds conhecidos (veja `docs/gotchas.md`, se existir)
   - [ ] Mudança definida, limites de impacto e critério de sucesso
3. **Ponto de elicitação:** liste o que faltou e peça ao usuário. Não suponha.
4. Se a análise mostrar que a melhoria não cabe numa story, PARE e recomende `@pm *create-epic`.

### 3. Extrair o contexto técnico das fontes

| Fonte | O que extrair |
|-------|---------------|
| Saída do `*document-project` | débito técnico e workarounds que afetam a story; arquivos-chave a modificar; padrões de integração existentes; problemas conhecidos na área; stack real, com versões e restrições |
| PRD brownfield | restrições técnicas; requisitos de integração e compatibilidade; organização do código; avaliação de risco |
| Documentação do usuário | especificações técnicas; exemplos de código a seguir; requisitos de integração; forma de testar usada no projeto |

Confirme no código (grep/glob) os arquivos e padrões citados antes de levá-los para a story.

### 4. Classificar executor e risco

1. Defina executor, gate e complexidade pela tabela do passo 6 de `create-story.md`.
2. Classifique o risco de integração:

| Nível | Quando | Exigências que entram em Tasks e Definição de Pronto |
|-------|--------|------------------------------------------------------|
| Alto | toca funcionalidade central, muitos pontos de integração, crítico para produção | feature flag recomendada; rollout em fases; rollback detalhado; plano de monitoramento e alerta |
| Médio | funcionalidade nova de escopo isolado, com alguma integração | testes de integração com o que já existe; testes unitários do código novo e do afetado; documentação |
| Baixo | documentação, só testes, correção isolada | revisão padrão e testes básicos |

3. Registre em Dev Notes o foco da área de integração:

| Área | Foco |
|------|------|
| Banco existente | impacto nos dados existentes, compatibilidade das políticas RLS, desempenho de índices sobre dados existentes, conflito de chave estrangeira; migration testada em dados com a forma de produção |
| API existente | compatibilidade com os clientes atuais, versionamento do contrato, breaking changes, impacto nos clientes; testes de contrato |
| Infra e deploy | configuração por ambiente, rollback verificado, deploy sem indisponibilidade, feature flag quando couber |
| UI existente | design system, acessibilidade preservada, continuidade do fluxo do usuário, compatibilidade de navegador; regressão visual nos fluxos existentes |
| Sistema externo | degradação controlada, retry, tratamento de erro, monitoramento; testes de cenários de falha |

### 5. Escrever a story

Crie `docs/stories/{epic}.{story}-{slug}.story.md` com `templates/story-tmpl.yaml` e as seções canônicas (seção 6.1 do guia de autoria). Vinda de epic: número do epic e próxima story livre. Story avulsa: siga a numeração existente do projeto; sem numeração, pergunte o epic ao usuário. Logo abaixo do título, registre a origem:

```markdown
<!-- Fonte: {tipo de documentação usada} -->
<!-- Contexto: melhoria brownfield em {sistema existente} -->
```

| Seção | Conteúdo específico de brownfield |
|-------|-----------------------------------|
| `## Status` | `Draft` |
| `## Executor` | passo 4, com a complexidade |
| `## Story` | Como/quero/para, tipo da melhoria (funcionalidade, correção, integração) e impacto no sistema existente |
| `## Critérios de Aceite` | Dado/Quando/Então, SEMPRE com os critérios de preservação (abaixo) |
| `## Escopo` | `### Dentro` e `### Fora`, com os limites de impacto |
| `## Dependências` | componentes existentes e pré-requisitos |
| `## Riscos` | formato abaixo |
| `## Definição de Pronto` | requisitos funcionais atendidos; integração verificada; regressão testada no que já existia; código no padrão existente; testes novos e existentes passando; documentação atualizada quando aplicável |
| `## Tasks / Subtasks` | exploração, implementação, verificação do existente e testes (abaixo) |
| `## Dev Notes` | contexto do sistema existente, abordagem de integração, padrão de referência, restrições técnicas, foco da área (passo 4) e **Informação faltante** |
| `## Testes` | padrão de testes do projeto; testes de integração nos pontos tocados |
| `## Registro do Dev`, `## Resultado do QA` | vazios, com as subseções do template |
| `## Change Log` | linha de criação (abaixo) |

**Critérios de preservação** (numere depois dos funcionais e adapte):

1. Dado o uso atual de {funcionalidade afetada}, quando a mudança entrar, então ela continua funcionando sem alteração.
2. Dado {sistema integrado}, quando receber as chamadas da funcionalidade nova, então mantém o comportamento atual.
3. Dado {área relacionada}, quando a suíte de testes rodar, então não há regressão.
4. Dado o volume atual de uso, quando a funcionalidade nova for usada, então o desempenho fica dentro dos limites aceitáveis.

**Riscos:**

```markdown
- **Nível de risco:** Médio
- **Risco principal:** {risco ao sistema existente}
- **Mitigação:** {como tratar}
- **Verificação:** {como confirmar a segurança}
- **Rollback:** {passos simples para desfazer}
- [ ] {funcionalidade existente} testada antes da mudança
- [ ] Mudança isolável ou atrás de feature flag
- [ ] Nenhuma breaking change em API existente
- [ ] Mudança de banco apenas aditiva
- [ ] UI segue os padrões existentes
- [ ] Impacto de desempenho desprezível
```

**Tasks** (estrutura de referência):

```markdown
- [ ] 1. Analisar a implementação atual de {componente} (CA: 2, 3)
  - [ ] 1.1 Revisar {arquivos} e documentar os pontos de integração
- [ ] 2. Implementar {funcionalidade} seguindo {arquivo de exemplo} (CA: 1)
  - [ ] 2.1 Integrar com {componente existente} mantendo {restrição}
- [ ] 3. Verificar o que já existia (CA: 2, 3, 4)
  - [ ] 3.1 Testar {funcionalidade existente} e checar o impacto de desempenho
- [ ] 4. Testes (CA: 1 a 4)
  - [ ] 4.1 Unitários no padrão do projeto e integração em {ponto de integração}
```

Inclua tasks de exploração quando o entendimento do sistema estiver incompleto e considerações de rollback nas tasks que mudam o existente. Cite arquivos e padrões sempre que conhecidos.

**Change Log:** `| {AAAA-MM-DD} | @pm [Scrum] | Story brownfield criada a partir de {fonte}. Status: Draft |`

### 6. Validar antes de gravar

| Grupo | Verificação |
|-------|-------------|
| Escopo | cabe numa story; na melhoria pequena, numa sessão de até 4 horas; integração direta; segue padrões existentes; sem trabalho de arquitetura |
| Completude | escopo e critérios claros; contexto técnico suficiente; abordagem de integração definida; riscos com mitigação |
| Segurança | proteção do existente incluída; rollback viável; testes cobrem o novo e o existente |
| Lacunas | informação crítica obtida do usuário; incertezas restantes documentadas em Dev Notes; tasks de exploração onde faltou entendimento |
| Clareza | requisitos sem ambiguidade; pontos de integração explícitos; critérios testáveis; rollback simples |

Item que não passa: corrija ou volte ao passo 2. Escopo que não cabe numa story: recomende `*create-epic`.

### 7. Comunicar

```text
Story brownfield criada: {título}
Documentação de origem: {fonte}
Local: {caminho}

Pontos de integração:
- {ponto 1}
- {ponto 2}

Riscos:
- {risco principal} (nível {nível})

{Se faltou informação} Alguns detalhes técnicos não ficaram claros. A story traz tasks de exploração para levantá-los durante a implementação.

Próximos passos:
1. Revise a story
2. Confirme se a abordagem de integração combina com o sistema
3. Valide com @pm *validate-story {storyId}
```

## Saída

- Story em `docs/stories/{epic}.{story}-{slug}.story.md`, status `Draft`, com a origem registrada.
- Mensagem de entrega (passo 7).
- Handoff `.sia/handoffs/handoff-pm-para-pm-{AAAAMMDD-HHmmss}.yaml` com `last_command: create-brownfield-story`.

## Critérios de conclusão

- [ ] Seções canônicas presentes; `Draft` na primeira linha não vazia de `## Status`
- [ ] Critérios de aceite em Dado/Quando/Então, incluindo a preservação do existente
- [ ] Nível de risco, rollback e verificações de segurança em `## Riscos`
- [ ] Tasks com exploração (quando faltou entendimento), verificação do existente e testes
- [ ] Lacunas perguntadas ao usuário ou registradas em "Informação faltante"
- [ ] Linha de criação no Change Log

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Documentação fragmentada disponível | recomende `*create-story` (passo 1) |
| Usuário sem resposta para uma lacuna | registre em "Informação faltante" e crie task de exploração |
| Escopo cresce durante a análise | PARE; recomende `*create-epic` |
| Arquivo da story já existe | não sobrescreva; pergunte o próximo número |
| Padrão citado não existe no código | não o leve para a story; pergunte ao usuário |

## Handoff

Próximo passo: `@pm *validate-story {storyId}`. Para mais stories da mesma avaliação: `*create-brownfield-story`.

Grave o handoff com `templates/agent-handoff-tmpl.yaml` (`from_agent: pm`, `to_agent: pm`, `last_command: create-brownfield-story`, `consumed: false`).
