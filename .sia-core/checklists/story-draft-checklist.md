# Checklist: Rascunho de Story

> Usado por: `@pm` [Scrum] em `*story-checklist {storyId}`, com a task execute-checklist, depois de criar a story e antes do `*validate-story`.
> Modo: interativo (categoria a categoria) ou YOLO (relatório completo de uma vez).

Valida se a story traz contexto suficiente para o @dev implementá-la com sucesso, assumindo um agente capaz de resolver o que for razoável sozinho.

[[LLM: INICIALIZAÇÃO

Antes de começar, garanta acesso a:
1. A story a validar (docs/stories/{epic}.{story}-{slug}.story.md ou fornecida diretamente)
2. O contexto do epic pai (docs/prd/epic-{n}-{slug}.md)
3. Os documentos de arquitetura ou de design referenciados
4. As stories anteriores relacionadas, se esta continua um trabalho anterior

IMPORTANTE: este checklist valida stories individuais ANTES do início da implementação.

PRINCÍPIOS DE VALIDAÇÃO:
1. Clareza: o @dev entende O QUE construir
2. Contexto: POR QUE isto está sendo construído e como se encaixa
3. Orientação: as decisões técnicas e os padrões-chave a seguir
4. Testabilidade: como verificar que a implementação funciona
5. Autossuficiência: a maior parte da informação necessária está na própria story

LEMBRE: assumimos agentes competentes, capazes de pesquisar documentação e código, tomar decisões técnicas razoáveis, seguir os padrões estabelecidos e pedir esclarecimento quando realmente travarem. Verificamos orientação SUFICIENTE, não detalhe exaustivo.

Marque cada item como [x] atendido, [ ] não atendido ou [N/A] não se aplica, com justificativa para [ ] e [N/A].]]

## 1. Clareza de Objetivo e Contexto

[[LLM: Sem objetivo claro, o @dev constrói a coisa errada. Verifique:
1. A story diz QUAL funcionalidade implementar
2. O valor de negócio ou o benefício ao usuário está claro
3. Está explicado como a story se encaixa no epic e no produto
4. As dependências são explícitas ("exige a story X concluída")
5. O sucesso é algo específico, não vago]]

- [ ] O objetivo da story está declarado com clareza
- [ ] A relação com os objetivos do epic é evidente
- [ ] Está explicado como a story se encaixa no fluxo geral do sistema
- [ ] As dependências de stories anteriores estão identificadas (quando aplicável)
- [ ] O contexto e o valor de negócio estão claros

## 2. Orientação Técnica de Implementação

[[LLM: O @dev precisa de contexto técnico suficiente para começar. Verifique:
1. Os principais arquivos e componentes a criar ou modificar estão citados
2. As escolhas de tecnologia estão especificadas onde não forem óbvias
3. Os pontos de integração com o código existente estão identificados
4. Os modelos de dados e os contratos de API estão definidos ou referenciados
5. Padrões fora do comum ou exceções estão sinalizados

Não é preciso listar todos os arquivos, só os importantes.]]

- [ ] Os principais arquivos a criar ou modificar estão identificados (não necessariamente todos)
- [ ] As tecnologias necessárias para esta story estão citadas
- [ ] As APIs ou interfaces críticas estão descritas o suficiente
- [ ] Os modelos de dados ou estruturas necessários estão referenciados
- [ ] As variáveis de ambiente necessárias estão listadas (quando aplicável)
- [ ] As exceções aos padrões de código estão registradas

## 3. Eficácia das Referências

[[LLM: As referências devem ajudar, não criar uma caça ao tesouro. Garanta que:
1. As referências apontem para seções específicas, não para documentos inteiros
2. A relevância de cada referência esteja explicada
3. A informação crítica esteja resumida na story
4. As referências estejam acessíveis (sem links quebrados)
5. O contexto de stories anteriores esteja resumido quando necessário]]

- [ ] As referências a documentos externos apontam para as seções relevantes
- [ ] A informação crítica de stories anteriores está resumida, não só referenciada
- [ ] Está explicado por que cada referência é relevante
- [ ] As referências usam formato consistente (ex.: `docs/arquivo.md#secao`)

## 4. Autossuficiência

[[LLM: As stories devem ser em boa parte autossuficientes, para evitar troca de contexto. Verifique:
1. Os requisitos centrais estão na story, não só nas referências
2. Os termos do domínio estão explicados ou são óbvios pelo contexto
3. As suposições estão explícitas
4. Os casos de borda estão citados (mesmo que adiados)
5. A story pode ser entendida sem ler outros dez documentos]]

- [ ] A informação central necessária está incluída (sem depender demais de documentos externos)
- [ ] As suposições implícitas estão explícitas
- [ ] Os termos e conceitos do domínio estão explicados
- [ ] Os casos de borda e os cenários de erro estão tratados

## 5. Orientação de Testes

[[LLM: Os testes garantem que a implementação funciona de verdade. Verifique:
1. A abordagem de teste está especificada (unitário, integração, e2e)
2. Os cenários-chave de teste estão listados
3. Os critérios de sucesso são mensuráveis
4. As considerações especiais de teste estão registradas
5. Os critérios de aceite da story são testáveis]]

- [ ] A abordagem de teste exigida está descrita
- [ ] Os cenários-chave de teste estão identificados
- [ ] Os critérios de sucesso estão definidos
- [ ] As considerações especiais de teste estão registradas (quando aplicável)

## 6. Formato da Story no SIA

[[LLM: A CLI e as tasks dependem do formato canônico da story (guia de autoria, seções 6.1 e 6.2). Confira a estrutura antes do conteúdo: uma story fora do formato quebra o *validate-story, o *develop e o `sia story status`.]]

- [ ] O arquivo segue o padrão docs/stories/{epic}.{story}-{slug}.story.md
- [ ] Todas as seções canônicas estão presentes, com os títulos exatos e na ordem da seção 6.1 (Status, Executor, Story, Critérios de Aceite, Escopo, Dependências, Riscos, Definição de Pronto, Tasks / Subtasks, Dev Notes, Testes, Registro do Dev, Resultado do QA, Change Log)
- [ ] A primeira linha não vazia depois de `## Status` contém só `Draft`
- [ ] `## Executor` com as quatro linhas: executor válido (@dev [chapéu], @devops ou @pm [Análise]), gate @pm [Qualidade], inspeção (@validator, ou "não se aplica" em story de pesquisa) e complexidade (Baixa, Média ou Alta, com motivo)
- [ ] `## Story` com persona, ação e benefício, mais o problema e o valor de negócio
- [ ] Escopo com as subseções Dentro e Fora preenchidas
- [ ] Tasks numeradas e ligadas aos critérios de aceite (CA: n)
- [ ] Registro do Dev e Resultado do QA vazios
- [ ] Change Log com a linha de criação, no formato `| {data} | @pm [Scrum] | Story criada ... Status: Draft |`

## Resultado

[[LLM: RELATÓRIO FINAL, conciso:

1. Resumo rápido: prontidão da story (PRONTA, PRECISA DE REVISÃO ou BLOQUEADA), nota de clareza (1 a 10) e principais lacunas
2. A tabela abaixo preenchida
3. Problemas específicos (se houver): lista concreta do que corrigir, melhorias sugeridas e dependências bloqueantes
4. Perspectiva do @dev: você conseguiria implementar a story como está escrita? Que perguntas teria? O que poderia causar atraso ou retrabalho?

Seja pragmático: documentação perfeita não existe, mas a story precisa dar ao @dev todo o contexto para concluir o trabalho sem criar bagunça.]]

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Clareza de objetivo e contexto | | |
| 2. Orientação técnica de implementação | | |
| 3. Eficácia das referências | | |
| 4. Autossuficiência | | |
| 5. Orientação de testes | | |
| 6. Formato da story no SIA | | |

Status: ✅ requisitos claramente atendidos; ⚠️ há lacunas, mas dá para trabalhar; ❌ falta informação crítica.

**Decisão:**
- **PRONTA:** a story dá contexto suficiente para a implementação (nenhuma categoria ❌). Próximo passo: `*validate-story {storyId}`.
- **PRECISA DE REVISÃO:** a story precisa de ajustes (ver problemas); corrija antes da validação.
- **BLOQUEADA:** falta informação externa (diga qual) e a story não segue até obtê-la.
