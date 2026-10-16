# Checklist: Autocrítica

> Usado por: `@dev` [Desenvolvimento] em `*develop` (task develop-story), em dois pontos obrigatórios de cada subtask:
> Passo 5.5, depois de escrever o código e antes de rodar os testes; Passo 6.5, depois que os testes passam e antes de marcar a subtask como concluída.
> Modo: sempre item a item, nos dois pontos.

Pontos obrigatórios de autorrevisão para pegar problemas antes que se propaguem. Pular qualquer um dos dois passos viola o fluxo do *develop.

[[LLM: INICIALIZAÇÃO

A autocrítica é OBRIGATÓRIA. O objetivo é pegar problemas ANTES da inspeção e do QA gate, não marcar caixinhas.

COMO EXECUTAR, nos dois passos:
1. PARE ao chegar no passo (5.5 ou 6.5)
2. Releia TODO o código escrito na subtask
3. Para cada item: faça a pergunta, use o "como verificar" e, se achar problema, registre, corrija na hora e marque como corrigido
4. Passo 5.5: se corrigiu algo, rode a seção 1 de novo, do início. Só siga para os testes com todos os itens aprovados
5. Passo 6.5: se mudou código, volte aos testes; com eles passando, continue o checklist. Só marque a subtask com todos os itens aprovados e os testes passando
6. Seja específico: cite exemplos concretos (arquivo, função, entrada), nunca afirmações genéricas
7. Use [N/A] só quando o item realmente não se aplica (ex.: "documentação de API atualizada" sem mudança de API) e justifique cada um

Ao terminar os dois passos, gere o Resumo da autocrítica (formato em Resultado) e anexe-o ao Log de debug da story.]]

## 1. Pós-código (Passo 5.5)

[[LLM: Objetivo: pegar bugs, casos de borda e falhas de segurança ANTES dos testes.

Pense como um atacante: "como isto quebra?". Considere null/undefined, condições de corrida e erros de limite. Que suposições podem estar erradas? O que acontece nas fronteiras (listas vazias, valores máximos, caracteres especiais)? E se uma dependência falhar? Achar bugs agora economiza depuração depois.]]

### 1.1 Bugs previstos, no mínimo 3 (SC-5.5.1, severidade alta)

Como verificar: fluxo lógico (erros de limite), condições de parada de laços, operadores (`=` e `==`, `&&` e `||`), acesso a null/undefined.

- [ ] Bug potencial 1: ____
- [ ] Bug potencial 2: ____
- [ ] Bug potencial 3: ____
- [ ] (Opcional) Outros bugs identificados

[[LLM: Liste bugs específicos, não preocupações vagas. Ex.: "condição de corrida se dois usuários atualizam o mesmo registro ao mesmo tempo"; "erro de null se user.profile for undefined"; "índice fora do limite quando items está vazio". Corrija cada um antes de seguir.]]

### 1.2 Casos de borda, no mínimo 3 (SC-5.5.2, alta)

Como verificar: entradas null/undefined; arrays e objetos vazios; valores de fronteira (0, -1, máximo); string vazia versus null; Unicode e caracteres especiais.

- [ ] Caso de borda 1: ____
- [ ] Caso de borda 2: ____
- [ ] Caso de borda 3: ____
- [ ] (Opcional) Outros casos considerados

[[LLM: Liste os casos com o comportamento esperado. Ex.: "lista de entrada vazia retorna resultado vazio, não erro"; "caracteres Unicode no nome de usuário são aceitos"; "arquivo acima do limite (10 MB) mostra erro amigável". Acrescente guardas ou validação para cada um.]]

### 1.3 Tratamento de erros (SC-5.5.3, alta)

- [ ] Toda operação assíncrona tem try/catch ou error boundary
- [ ] Os erros são registrados com contexto suficiente para depuração (qual operação falhou)
- [ ] As mensagens de erro ao usuário são amigáveis e acionáveis
- [ ] Os erros não expõem informação sensível
- [ ] Operações que falham não deixam o sistema em estado inconsistente
- [ ] Há caminho de recuperação definido onde for possível

### 1.4 Segurança (SC-5.5.4, crítica)

- [ ] Nenhum segredo, chave de API ou credencial no código
- [ ] Entrada do usuário validada e sanitizada
- [ ] Sem injeção SQL/NoSQL nem XSS (saída codificada)
- [ ] Dados sensíveis fora de logs e de mensagens de erro
- [ ] Verificações de autenticação e autorização onde necessário

Achado de segurança: corrija imediatamente, antes de qualquer outro passo.

### 1.5 Resiliência (SC-5.5.5, média)

- [ ] Falhas de rede tratadas
- [ ] Timeouts configurados
- [ ] Retentativas onde fizer sentido
- [ ] O usuário recebe retorno quando algo falha
- [ ] Falhas parciais não corrompem o estado

## 2. Pós-teste (Passo 6.5)

[[LLM: Objetivo: garantir qualidade, manutenibilidade e aderência aos padrões. É o último portão antes de marcar a subtask.

O código parece pertencer a esta base? Outra pessoa o entenderia sem perguntar? Procure números mágicos, strings fixas e URLs no meio do código. Os casos de borda da seção 1.2 têm teste? Se a API ou o comportamento mudou, está documentado?]]

### 2.1 Padrões do projeto (SC-6.5.1, média)

- [ ] O código segue os padrões e as convenções do projeto (compare com arquivos semelhantes)
- [ ] A estrutura de arquivos segue a organização do projeto
- [ ] Os nomes seguem as convenções da base de código
- [ ] Imports e exports seguem o padrão existente
- [ ] O estilo de tratamento de erros segue o padrão do projeto

### 2.2 Sem valores fixos no código (SC-6.5.2, alta)

- [ ] Nenhum número mágico (use constantes nomeadas ou configuração)
- [ ] Nenhuma URL ou endpoint fixo (use ambiente ou configuração)
- [ ] Nenhum timeout ou limite fixo (use configuração)
- [ ] Nenhuma feature flag embutida (use o mecanismo de flags do projeto)
- [ ] Chaves de API SEMPRE em variáveis de ambiente
- [ ] Valores configuráveis documentados

### 2.3 Testes (SC-6.5.3, alta)

- [ ] Testes unitários para as funções e os métodos novos
- [ ] Caminho feliz coberto
- [ ] Caminhos de erro e de exceção cobertos
- [ ] Os casos de borda da seção 1.2 têm teste, incluindo valores de fronteira
- [ ] Pontos de integração testados
- [ ] Testes determinísticos (sem falhas aleatórias), com nomes que descrevem o que testam

### 2.4 Documentação (SC-6.5.4, média)

- [ ] JSDoc/TSDoc nas funções públicas (quando aplicável)
- [ ] Comentários explicam a lógica complexa
- [ ] README atualizado se o setup, o uso ou o comportamento mudou
- [ ] Documentação de API atualizada se endpoints mudaram
- [ ] Definições de tipo corretas
- [ ] Entrada no CHANGELOG quando a mudança afeta o usuário

### 2.5 Code smells (SC-6.5.5, média)

- [ ] Nenhuma função com mais de 50 linhas (divida)
- [ ] Nenhum código duplicado (extraia)
- [ ] Nenhum aninhamento com mais de 3 níveis (achate)
- [ ] Nenhuma condicional complexa demais (simplifique)
- [ ] Nenhum "objeto deus" (decomponha)
- [ ] Nenhum código morto (remova)

### 2.6 Manutenibilidade (SC-6.5.6, média)

- [ ] Nomes de variáveis e funções autoexplicativos
- [ ] Lógica fácil de seguir
- [ ] Responsabilidade única
- [ ] Dependências explícitas
- [ ] Efeitos colaterais documentados

### 2.7 Limpeza

- [ ] Nenhum console.log esquecido
- [ ] Nenhum bloco de código comentado
- [ ] Nenhum TODO sem item de acompanhamento (backlog ou issue)
- [ ] Nenhum artefato de depuração (debugger, dados de teste)
- [ ] Nenhum import ou variável sem uso

## 3. Antipadrões a Evitar

| Antipadrão | O que é | Por que é ruim | Como evitar |
|------------|---------|----------------|-------------|
| Carimbo | Marcar tudo como aprovado sem verificar | Anula o propósito da autocrítica | Releia o código para cada item |
| Deixar para os testes | Pular o Passo 5.5 porque "os testes pegam" | Testes não pegam tudo (segurança, manutenibilidade) | Rode sempre o 5.5 antes dos testes |
| Pular no código simples | Não fazer a autocrítica em mudança "simples" | Mudanças simples costumam esconder bugs sutis | Rode o checklist completo sempre |
| Laço sem fim | Achar problemas mais de 5 vezes no mesmo checklist | Indica problema na abordagem | Com 5 ou mais problemas, pare e reveja a abordagem |

## 4. Dispensa da Autocrítica

| Situação | Dispensa |
|----------|----------|
| Hotfix de produção com restrição de tempo | ✅ aceitável |
| Mudança só de documentação | ✅ aceitável |
| Reversão de commit | ✅ aceitável |
| "Confio no meu código" | ❌ nunca |
| "Os testes já passam" | ❌ nunca |
| "É uma mudança simples" | ❌ nunca |
| Pressão de prazo | ❌ nunca |

A dispensa vale para os dois passos (5.5 e 6.5), nunca para testes e lint. Registre no Log de debug da story: "AVISO: autocrítica dispensada ({motivo}). Pode haver riscos de qualidade." A dispensa fica visível na inspeção e no QA gate e pode gerar escrutínio adicional.

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Pós-código (Passo 5.5) | | problemas achados e corrigidos |
| 2. Pós-teste (Passo 6.5) | | problemas achados e corrigidos; testes rodados de novo? |

Resumo da autocrítica, a anexar ao Log de debug da story:

```markdown
### Autocrítica: subtask 1.1
- Passo 5.5: APROVADA; 2 problemas achados, 2 corrigidos
  - SC-5.5.2: verificação de null na lista de entrada
  - SC-5.5.3: try/catch na operação assíncrona
- Passo 6.5: APROVADA; 1 problema achado, 1 corrigido (testes rodados de novo)
  - SC-6.5.2: timeout extraído para constante de configuração
- Total: 3 achados, 3 corrigidos. Pronta para commit: SIM
```

**Decisão:** APROVADA quando todos os itens estão [x] ou [N/A] justificado e os testes passam. REPROVADA quando qualquer item obrigatório fica [ ] sem justificativa: liste os itens, corrija, rode a autocrítica de novo e não avance de passo.
