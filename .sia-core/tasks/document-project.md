---
id: document-project
title: Documentar um projeto existente
agent: dev
hat: architect
elicit: true
inputs:
  - 'foco (opcional): PRD, epic, requisitos ou descrição da evolução planejada'
outputs:
  - 'docs/brownfield-architecture.md: arquitetura real do sistema, com débitos, contornos e restrições'
depends_on:
  tasks: [advanced-elicitation.md]
next: [create-brownfield-prd, create-brownfield-architecture, shard-doc]
source: [document-project.md]
---

# Documentar um projeto existente

## Objetivo

Gerar um documento único que descreva o ESTADO REAL de um sistema existente (estrutura, stack, padrões de fato, débitos, contornos e restrições), para que os agentes encontrem o que precisam e trabalhem no código sem suposições.

## Quando usar

- Projeto brownfield sem documentação adequada, antes do PRD brownfield ou das primeiras stories.
- Antes de uma evolução grande, focando nas áreas que ela vai tocar.
- Não use para: arquitetura de uma evolução nova (`*create-brownfield-architecture`), mapeamento rápido de stack e conflitos (`*analyze-codebase`).

## Pré-condições

- [ ] Acesso de leitura ao código do projeto.

## Passos

### 1. Definir o foco

Procure PRD ou requisitos (`docs/prd.md`, `docs/prd/`, epic ou texto do usuário).

- **Com PRD:** entenda a evolução planejada, identifique módulos e serviços afetados e documente SÓ essas áreas.
- **Sem PRD:** **Ponto de elicitação:**

```text
Não encontrei PRD nem requisitos. Para documentar com foco, escolha:
1. Criar um PRD brownfield antes (@pm *create-brownfield-prd)
2. Informar requisitos, epic ou descrição da feature que já existam
3. Descrever o foco (ex.: "pagamentos no serviço de usuários", "refatorar a autenticação", "integrar nova API")
4. Documentar o sistema inteiro (pode ficar extenso em projetos grandes)
```

Opções 1 a 3: use o contexto para focar. Opção 4 ou recusa: análise completa.

### 2. Análise inicial

1. Estrutura: pastas da raiz e organização geral.
2. Stack: `package.json`, `requirements.txt`, `Cargo.toml`, `pom.xml` etc.
3. Build: scripts, configuração de CI/CD e comandos de desenvolvimento.
4. Documentação existente: READMEs e pastas `docs/`.
5. Padrões de código: amostre arquivos-chave para ver convenções de nome e abordagem arquitetural.

**Ponto de elicitação:** pergunte ao usuário:

1. Qual o propósito principal do projeto?
2. Que áreas são complexas ou importantes para os agentes entenderem?
3. Que tipo de trabalho os agentes vão fazer (correção, feature, refatoração, testes)?
4. Há padrão de documentação preferido?
5. Que nível técnico o documento deve mirar (júnior, sênior, misto)?
6. Há uma feature ou evolução específica planejada?

### 3. Análise profunda

1. Explore: pontos de entrada, configuração e ambiente, dependências e versões, build e deploy, suítes de teste e cobertura.
2. **Ponto de elicitação:** faça perguntas de esclarecimento, como: "Vejo que usam {tecnologia}; há padrões próprios a documentar?", "Quais partes são mais críticas ou difíceis?", "Há conhecimento que só existe na cabeça do time?", "Que débitos ou problemas conhecidos devo registrar?", "Que partes mudam com mais frequência?".
3. Mapeie a realidade: padrões usados de fato (não os ideais), onde está a regra de negócio, pontos de integração e dependências externas, contornos e débitos, desvios do padrão.
4. Com PRD: analise também o que precisa mudar para a evolução.

### 4. Gerar o documento

Grave `docs/brownfield-architecture.md`. Documente o que EXISTE, inclusive débitos, inconsistências, legado intocável, restrições de integração e gargalos. Referencie arquivos reais em vez de duplicar conteúdo. Use os títulos fixos `## Tech Stack`, `## Source Tree` e `## Coding Standards` (guia de autoria, 5.3), para que a fragmentação gere os `devLoadAlwaysFiles`.

```markdown
# {Projeto}: Arquitetura Brownfield

## Introdução
Estado ATUAL do código, com débitos, contornos e padrões reais; referência para agentes de IA.
### Escopo
(com PRD: "Focado nas áreas de: {evolução}"; sem PRD: "Documentação do sistema inteiro")
### Change Log
| Data | Versão | Descrição | Autor |

## Referência rápida: arquivos-chave e pontos de entrada
- Entrada principal, configuração, regra de negócio, APIs, modelos, algoritmos complexos
### Áreas de impacto da evolução (com PRD)

## Arquitetura de alto nível
### Resumo técnico
### Estrutura do repositório (monorepo ou não, gerenciador de pacotes, decisões incomuns)

## Tech Stack
| Categoria | Tecnologia | Versão | Observações |

## Source Tree
(árvore real com comentários, ex.: "services/: padrões inconsistentes entre usuário e pagamento"; "legacy/: NÃO MODIFICAR")
### Módulos-chave e propósito

## Coding Standards
(convenções observadas de fato: nomes, organização, tratamento de erros, imports; desvios conhecidos)

## Modelos de dados e APIs
(referencie os arquivos de modelo, a spec OpenAPI e os endpoints não documentados encontrados)

## Débito técnico e problemas conhecidos
### Débitos críticos
### Contornos e gotchas

## Integrações
### Serviços externos
| Serviço | Propósito | Tipo de integração | Arquivos-chave |
### Integrações internas

## Desenvolvimento e deploy
### Setup local (passos que funcionam de verdade e problemas conhecidos)
### Build e deploy

## Realidade dos testes
### Cobertura atual
### Como rodar

## Análise de impacto da evolução (com PRD)
### Arquivos que vão mudar
### Arquivos e módulos novos
### Considerações de integração

## Apêndice: comandos úteis e diagnóstico
```

Contornos e gotchas encontrados: registre também com `*gotchas add`, para que fiquem consultáveis na autocrítica.

### 5. Entregar

- Na IDE: crie o arquivo e informe que ele reúne toda a informação arquitetural e pode ser fragmentado com `@pm *shard-doc docs/brownfield-architecture.md docs/architecture`.
- Em interface web: apresente o documento inteiro (em partes, se longo) e peça para salvá-lo em `docs/brownfield-architecture.md`.

### 6. Revisar a qualidade

1. Precisão: cada detalhe técnico confere com o código.
2. Completude: os componentes principais estão documentados.
3. Foco: com escopo definido, as áreas relevantes têm destaque.
4. Clareza: explicações claras para agentes de IA.
5. Navegação: seções bem estruturadas.

Depois de cada seção principal, ofereça as opções da task `advanced-elicitation` para refinar com o usuário.

## Saída

`docs/brownfield-architecture.md`, um documento único que reflete o sistema real, com caminhos verdadeiros, débitos, contornos, restrições e, com PRD, a análise de impacto da evolução.

## Critérios de conclusão

- [ ] Documento reflete a REALIDADE, inclusive débitos e contornos
- [ ] Arquivos e módulos citados com caminhos reais; modelos e APIs referenciados, não duplicados
- [ ] Seções `## Tech Stack`, `## Source Tree` e `## Coding Standards` presentes
- [ ] Restrições técnicas e gotchas explícitos
- [ ] Com PRD: análise de impacto clara do que precisa mudar

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Usuário não define foco | Siga com a documentação completa e avise sobre o tamanho |
| `docs/brownfield-architecture.md` já existe | Pergunte: 1. atualizar o existente, 2. gravar uma versão nova, 3. cancelar |
| Área sem acesso de leitura | Registre a lacuna no documento e siga |
| Informação não confirmada no código | Marque como "a confirmar com o time"; não invente |

## Handoff

Próximo passo: `@pm *create-brownfield-prd` (PRD da evolução, alimentado por este documento), `*create-brownfield-architecture` quando houver mudança arquitetural relevante, ou `@pm *shard-doc` para fragmentar o documento.
