# Template de Tech Preset

> Use este template para criar presets de arquitetura por tecnologia. Copie para `.sia-core/data/tech-presets/{id}.md`, preencha e valide com `@dev *validate-tech-preset {id}`.
> Seções obrigatórias: Metadados, Padrões de Design, Estrutura do Projeto, Stack Tecnológica, Padrões de Código e Estratégia de Testes. Recomendadas: Templates de Arquivo, Tratamento de Erros e Diretrizes de Desempenho.

---

## Metadados

```yaml
preset:
  id: nome-da-tecnologia           # kebab-case, igual ao nome do arquivo
  name: 'Preset Nome da Tecnologia'
  version: 1.0.0                   # semver X.Y.Z
  description: 'Quando usar este preset, em uma frase'
  technologies:
    - tecnologia-1
    - tecnologia-2
  suitable_for:
    - 'Tipo de projeto 1'
    - 'Tipo de projeto 2'
  not_suitable_for:
    - 'Tipo de projeto a evitar'
```

---

## Padrões de Design

> Liste os padrões de design recomendados para esta tecnologia, com nota de execução e nota anti-bug.

### Padrão 1: [Nome do padrão]

**Propósito:** [descrição do propósito]

**Nota de execução:** X/10 | **Nota anti-bug:** X/10

```[linguagem]
// Exemplo de código do padrão
```

**Bugs eliminados:**

- [ ] Tipo de bug 1
- [ ] Tipo de bug 2

**Por que funciona:**

- Motivo 1
- Motivo 2

---

## Estrutura do Projeto

> Defina a estrutura de pastas recomendada para projetos com esta tecnologia.

```
/project-root
  /src
    /[pasta1]        # Descrição
    /[pasta2]        # Descrição
  /tests             # Descrição
  /config            # Descrição
```

### Justificativa da estrutura

- **[pasta1]:** explicação
- **[pasta2]:** explicação

---

## Stack Tecnológica

> Liste as tecnologias e bibliotecas recomendadas.

| Categoria | Tecnologia | Versão | Propósito |
| --------- | ---------- | ------ | --------- |
| Framework | [nome]     | ^X.X.X | [propósito] |
| Estado    | [nome]     | ^X.X.X | [propósito] |
| Testes    | [nome]     | ^X.X.X | [propósito] |
| Estilo    | [nome]     | ^X.X.X | [propósito] |

### Dependências necessárias

```bash
# Dependências principais
npm install [pacotes]

# Dependências de desenvolvimento
npm install -D [pacotes]
```

---

## Padrões de Código

> Defina os padrões de código específicos desta tecnologia.

### Convenções de nome

| Elemento    | Convenção   | Exemplo       |
| ----------- | ----------- | ------------- |
| Arquivos    | [convenção] | `example.ts`  |
| Componentes | [convenção] | `MyComponent` |
| Funções     | [convenção] | `myFunction`  |
| Constantes  | [convenção] | `MY_CONSTANT` |

### Regras críticas

1. **Regra 1:** descrição
2. **Regra 2:** descrição
3. **Regra 3:** descrição

### Exemplos de código

#### Exemplo bom

```[linguagem]
// Exemplo de código bom
```

#### Exemplo ruim

```[linguagem]
// Exemplo de código ruim: evite
```

---

## Estratégia de Testes

> Defina a estratégia de testes desta tecnologia.

### Pirâmide de testes

```
         /\
        /E2E\           X% - [descrição]
       /------\
      /Integração\      X% - [descrição]
     /------------\
    /  Unitários   \    X% - [descrição]
   /----------------\
```

### O que testar

#### Sempre testar (crítico)

- [ ] Item 1
- [ ] Item 2

#### Considerar testar

- [ ] Item 1
- [ ] Item 2

#### Nunca testar

- [ ] Item 1
- [ ] Item 2

### Template de arquivo de teste

```[linguagem]
// Template de arquivo de teste
describe('[Componente/Serviço]', () => {
  it('should [comportamento esperado]', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

---

## Templates de Arquivo

> Forneça templates dos arquivos mais comuns desta tecnologia.

### Template 1: [Nome]

```[linguagem]
// Conteúdo do template
```

### Template 2: [Nome]

```[linguagem]
// Conteúdo do template
```

---

## Tratamento de Erros

> Defina os padrões de tratamento de erros.

### Padrão de tratamento de erros

```[linguagem]
// Exemplo de tratamento de erro
```

### Erros comuns e soluções

| Erro      | Causa   | Solução   |
| --------- | ------- | --------- |
| [Erro 1]  | [Causa] | [Solução] |
| [Erro 2]  | [Causa] | [Solução] |

---

## Diretrizes de Desempenho

> Diretrizes de desempenho específicas desta tecnologia.

### Faça

- [ ] Otimização 1
- [ ] Otimização 2

### Não faça

- [ ] Antipadrão 1
- [ ] Antipadrão 2

---

## Integração com o SIA

> Como este preset se encaixa no fluxo do SIA.

### Fluxo recomendado

1. **Planejamento:** `@dev` [Arquitetura] usa este preset em `*create-architecture`; a Stack Tecnológica e os Padrões de Código alimentam as seções `## Tech Stack` e `## Coding Standards` da arquitetura
2. **Desenvolvimento:** `@dev *develop {storyId}` segue estes padrões
3. **Qualidade:** `@pm` [Qualidade] e `@validator` usam a estratégia de testes definida

### Templates relacionados

- `architecture-tmpl.yaml`: documento de arquitetura
- `front-end-architecture-tmpl.yaml`: detalhes de frontend

---

## Histórico de Mudanças

| Data       | Versão | Mudanças       |
| ---------- | ------ | -------------- |
| AAAA-MM-DD | 1.0.0  | Versão inicial |

---

_Tech Preset do SIA_
