---
id: brainstorm
title: Facilitar sessão de brainstorming
agent: pm
hat: analyst
elicit: true
inputs:
  - 'tema: desafio, oportunidade ou pergunta da sessão'
  - 'restrições e objetivo da sessão (perguntados no passo 1)'
  - 'documentos de contexto (opcional): brief, PRD, backlog, arquitetura'
outputs:
  - 'Documento de resultados no caminho de output.filename de brainstorming-output-tmpl.yaml (padrão docs/brainstorming-session-results.md), quando o usuário quiser o documento'
depends_on:
  tasks: [create-doc.md]
  templates: [brainstorming-output-tmpl.yaml]
  data: [brainstorming-techniques.md]
next: [create-project-brief, research, market-research]
source: [facilitate-brainstorming-session.md, analyst-facilitate-brainstorming.md]
---

# Facilitar sessão de brainstorming

## Objetivo
Conduzir uma sessão estruturada de brainstorming para gerar, categorizar e priorizar ideias (funcionalidades, soluções ou decisões estratégicas). Por padrão o `@pm` facilita e o usuário gera as ideias; na sessão multiperspectiva, o `@pm` gera ideias em rodadas e o usuário reage. A sessão termina com ideias priorizadas e próximos passos acionáveis.

## Quando usar
- `@pm *brainstorm {tema}`: ideação antes do brief ou do PRD, busca de soluções para um problema, planejamento estratégico.
- Não use para levantar requisitos formais de uma story (`gather-requirements`).

## Princípios de facilitação
- **Você facilita:** guie o usuário a gerar as próprias ideias com perguntas, estímulos e exemplos. Só gere ideias por ele se ele insistir (ou na sessão multiperspectiva).
- **Diálogo:** pergunte, espere a resposta, construa sobre as ideias dele ("Sim, e...").
- **Uma técnica por vez:** fique nela até o usuário querer trocar; sempre pergunte antes de trocar ("Pronto para tentar outra abordagem?").
- **Adie o julgamento:** quantidade gera qualidade (referência: 100 ideias em 60 minutos).
- **Aprofunde e conecte:** "Conte mais sobre isso..."; "Como isso se relaciona com a sua ideia sobre...?".
- **Energia:** confira o engajamento ("Como você está se sentindo com essa direção?") e ofereça pausa ou troca de técnica quando cair.
- **Registre tudo** para o documento final.

## Pré-condições
- [ ] Tema específico: uma pergunta ou desafio concreto (ex.: "Como reduzir o abandono no cadastro?")

## Passos

### 1. Preparar a sessão
Faça as 4 perguntas, sem antecipar o que vem depois:
1. Sobre o que vamos fazer brainstorming?
2. Há restrições ou parâmetros?
3. O objetivo é exploração ampla ou ideação focada?
4. Quer um documento estruturado para consultar depois? (padrão: sim)

Se houver documentos de contexto, leia e resuma os pontos-chave: restrições, requisitos e objetivos.

### 2. Escolher a abordagem
Apresente as opções numeradas:
1. Você escolhe as técnicas
2. Eu recomendo técnicas para o contexto
3. Técnicas sorteadas, para variar a criatividade
4. Fluxo progressivo, do amplo ao focado
5. Sessão multiperspectiva: eu gero ideias em rodadas a partir de perspectivas do projeto e você reage

Na opção 1, liste em lista numerada as técnicas de `data/brainstorming-techniques.md` para a escolha pelo número.

### 3. Executar as técnicas (opções 1 a 4)
1. Aplique a técnica como descrita no arquivo de técnicas (cada uma diz como interagir: uma pergunta por vez, uma letra por vez, um chapéu por vez...).
2. Continue até o usuário querer: trocar de técnica; aplicar as ideias atuais numa nova técnica; passar para a convergência; encerrar.
3. Se o documento foi pedido, registre por técnica: nome e duração; ideias nas palavras do usuário; insights e padrões; reflexões do usuário sobre o processo.

Fluxo da sessão:
| Fase | Duração | Foco |
|------|---------|------|
| Aquecimento | 5 a 10 min | confiança criativa |
| Divergência | 20 a 30 min | quantidade acima de qualidade |
| Convergência | 15 a 20 min | agrupar e categorizar |
| Síntese | 10 a 15 min | refinar e desenvolver os conceitos |

### 4. Sessão multiperspectiva (opção 5)
1. Defina o objetivo:
   - **ideação:** pensamento divergente, máximo de ideias;
   - **solução:** pensamento convergente, avaliar e refinar;
   - **estratégia:** frameworks estruturados (ex.: SWOT, OKRs).
2. Escolha de 3 a 5 perspectivas ligadas ao tema (ex.: usuário, produto, arquitetura, dados, UX, operação) e anuncie: "Perspectivas da sessão: ...". As perspectivas são lentes do `@pm`; ele não fala em nome de outros agentes.
3. Rodada 1: de 3 a 5 ideias por perspectiva, sem avaliação.
4. Rodada 2: de 2 a 3 ideias novas por perspectiva, construindo sobre as ideias anteriores ou remixando-as.
5. Rodada 3 (curingas): 1 ou 2 ideias não convencionais do tipo "e se...".
6. Depois de cada rodada, o usuário reage: acrescenta, descarta ou combina ideias. Cada ideia registra a perspectiva de origem.

### 5. Convergir: categorizar e priorizar
1. Agrupe as ideias em 3 a 7 categorias; junte duplicadas e ligue conceitos relacionados.
2. Classifique para o documento:
   - **Oportunidades imediatas:** prontas para implementar;
   - **Inovações futuras:** exigem desenvolvimento ou pesquisa;
   - **Moonshots:** conceitos ambiciosos e transformadores;
   - **Insights e aprendizados:** percepções-chave da sessão.
3. Priorize quando o objetivo pedir ou o usuário quiser: valor (1 a 10), esforço (1 a 10), ROI (valor ÷ esforço) e alinhamento com a estratégia (1 a 10).
4. Selecione as prioridades: as 3 principais vão para o plano de ação (justificativa, próximos passos, recursos, prazo). Na sessão multiperspectiva, liste até 10 recomendações priorizadas, cada uma com próximos passos.

### 6. Gerar o documento (se pedido)
Preencha `templates/brainstorming-output-tmpl.yaml` seguindo `create-doc` em modo não interativo (o conteúdo já veio da sessão). O documento cobre: resumo executivo (tema, objetivos, técnicas, total de ideias, temas-chave); uma seção por técnica; categorização; plano de ação com as prioridades; reflexão e continuidade (o que funcionou, áreas a explorar, técnicas recomendadas, perguntas que surgiram, próxima sessão).

## Saída
Ideias categorizadas e priorizadas no chat e, se o usuário quiser, o documento no caminho de `output.filename` do template (padrão `docs/brainstorming-session-results.md`).

## Critérios de conclusão
- [ ] Pelo menos 10 ideias geradas (abaixo disso, ofereça estender a sessão, outra técnica ou outra rodada)
- [ ] Todas as ideias categorizadas, em pelo menos 3 categorias
- [ ] Prioridades com próximos passos concretos
- [ ] O usuário consegue agir já sobre pelo menos 3 ideias
- [ ] Documento gravado, quando pedido

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Tema vago | Peça uma pergunta ou desafio específico |
| Energia baixa ou travamento | Ofereça pausa, troca de técnica ou um estímulo aleatório |
| Usuário quer que você gere as ideias | Ofereça a sessão multiperspectiva (opção 5) |
| Menos de 10 ideias | Estenda a sessão, troque de técnica ou faça nova rodada |

## Handoff
- Ideias de produto: `@pm *create-project-brief`.
- Ideias que precisam de evidência: `@pm *research {tema}` ou `@pm *market-research`.
- Ideia pronta para virar trabalho: `@pm *create-epic` ou `@pm *backlog add`.
