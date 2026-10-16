---
command: '{{comando}}'                   # sem acento e sem prefixo: revisar-feature, revisar-seguranca, revisar-todo...
scope: '{{escopo}}'                      # argumento recebido (2.1, epic-3, caminho, repositório) ou entrega-recente
story: '{{storyId}}'                     # vazio quando o escopo não é uma story
verdict: '{{veredito}}'                  # aprovado | aprovado com ressalvas | reprovado
date: '{{AAAA-MM-DDTHH:mm:ss-03:00}}'
revision: '{{hash curto}}'               # git rev-parse --short HEAD, sempre entre aspas; vazio sem git
findings: { bloqueante: 0, alto: 0, medio: 0, baixo: 0, nota: 0 }
---
<!--
  Template do relatório de inspeção do @validator (task inspect.md).
  O relatório começa exatamente pelo frontmatter acima (guia de autoria, seção 6.2): a CLI lê esses campos.
  Grave em docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md e nunca sobrescreva um relatório anterior.
  Troque cada {{placeholder}}, conte os achados por severidade em findings e apague este comentário.
-->

# Inspeção de entrega: {{comando}}

- **Agente:** @validator (Vera)
- **Data:** {{AAAA-MM-DD HH:mm}}
- **Comando:** {{comando}}
- **Lentes:** {{lentes do comando}}
- **Argumento:** {{argumento ou "entrega recente"}}
- **Branch:** {{branch}}
- **Base do diff:** {{merge-base, working tree ou commit}}
- **Revisão:** {{hash curto}}

## Escopo lido

- Pedido (story, epic, issue): {{caminho ou "não havia"}}
- Commits: {{lista curta}}
- Arquivos: {{lista}}
- Diretórios além do diff: {{lista ou "nenhum"}}

## Fora do escopo

{{o que não foi lido, e por quê}}

## Veredito

**{{aprovado | aprovado com ressalvas | reprovado}}**

{{uma frase com o motivo}}

Este veredito não altera status de story nem de pull request. A correção fica com quem implementa.

## Achados

### V-001: {{título curto}}

| Campo | Valor |
| --- | --- |
| Lente | {{gaps, falhas, logica, regressao, seguranca, arquitetura ou codigo-morto}} |
| Severidade | {{bloqueante, alto, medio, baixo ou nota}} |
| Confiança | {{alta, media ou baixa}} |
| Onde | {{arquivo:linha ou intervalo no diff}} |
| Preexistente | {{sim ou não}} |

**Evidência:** {{o que foi observado, com a busca que sustentou}}

**Impacto:** {{o que quebra para quem usa}}

**Correção recomendada:** {{uma frase}}

<!-- Repita o bloco para cada achado. Se não houver achados, escreva: nenhum achado nas lentes deste comando. -->

## Lentes deste comando sem achado

{{lista}}

## Handoff

- Quem implementa: {{lista de correções, ou "nada a corrigir"}}
- Decisão de arquitetura, se houver desvio: {{desvio ou "nenhum"}}
- Próximo passo: {{@pm *qa-gate {storyId} | @dev *apply-qa-fixes {storyId} | @pm *qa-loop resume {storyId} (QA Loop ativo) | escopo sem story: quem implementa decide}}

## Limites

{{testes não rodados, interface não aberta no navegador, buscas que ficaram inconclusivas}}
