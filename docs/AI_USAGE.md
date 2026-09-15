# Taskly — Registro de Engenharia Assistida por IA

## Propósito

O Taskly usa IA como acelerador de engenharia, não como autoridade autônoma de desenvolvimento de software.

Ferramentas de IA podem auxiliar em exploração de arquitetura, implementação, refatoração, testes automatizados, revisão de segurança, documentação e depuração. Todo output relevante passa por revisão humana antes de virar decisão de projeto ou ser integrado ao código.

Este documento registra o trabalho assistido por IA que é relevante, com ênfase em:

- contexto de engenharia;
- o prompt/objetivo;
- a contribuição útil;
- a revisão humana;
- sugestões incorretas, incompletas ou excessivas;
- a decisão final.

O objetivo é rastreabilidade, e não registrar cada autocomplete trivial.

---

## Formato de registro

Cada interação relevante usa a estrutura abaixo:

```text
AI-XXX — Título
Data:
Ferramenta/modelo:
Objetivo:
Prompt/contexto:
Contribuição da IA:
Revisão humana:
Correção/rejeição:
Decisão final:
Arquivos/commits relacionados:
```

---

## AI-001 — Interpretar o desafio técnico e definir uma estratégia de avaliação

**Data:** 2026-09-14  
**Ferramenta/modelo:** ChatGPT  
**Objetivo:** Analisar o desafio técnico da UEX antes da implementação e identificar o que a entrega precisa demonstrar além de um CRUD básico.

### Prompt/contexto

O documento do desafio foi fornecido na íntegra. A análise solicitada focou em como construir uma entrega com bom desempenho frente aos critérios de avaliação visíveis, em vez de apenas satisfazer o escopo funcional mínimo.

O contexto relevante incluía:

- a vaga é de Fullstack sênior;
- o desafio é o Taskly, um sistema pessoal de gestão de tarefas;
- a janela de entrega é de três dias corridos;
- a empresa avalia explicitamente funcionalidade, arquitetura/qualidade de código, uso de IA, documentação, comunicação técnica e trabalho além do escopo mínimo;
- a entrega deve incluir código-fonte, README, Spec técnica, registros de prompts, deploy quando possível e um vídeo técnico.

### Contribuição da IA

A análise recomendou tratar o projeto como um MVP com mentalidade de produção e alinhar o processo de engenharia ao modelo de pontuação. Destacou que a documentação e a rastreabilidade de IA deveriam ser criadas durante o desenvolvimento, em vez de reconstruídas retroativamente no final.

Também recomendou:

- escrever uma especificação técnica antes da implementação;
- manter as decisões de arquitetura no Git;
- proteger as fronteiras de autorização com testes automatizados;
- priorizar uma experiência polida de Kanban/lista;
- manter os extras focados em valor de produto/engenharia, e não em quantidade de funcionalidades.

### Revisão humana

Aceita. A estratégia é consistente com os critérios explícitos do desafio e não adiciona requisitos de produto sem respaldo ao escopo obrigatório.

### Correção/rejeição

Nenhuma para a estratégia de avaliação em alto nível.

### Decisão final

Usar um fluxo de desenvolvimento spec-driven e rastreável, e otimizar a entrega para completude, qualidade de engenharia, evidência de revisão de IA, documentação e apresentação — não para contagem bruta de funcionalidades.

### Arquivos/commits relacionados

- `docs/SPEC.md`

---

## AI-002 — Exploração e correção do stack de frontend/backend

**Data:** 2026-09-14  
**Ferramenta/modelo:** ChatGPT  
**Objetivo:** Selecionar um stack que reflita tanto a expertise mais forte do candidato quanto o contexto tecnológico revelado durante a entrevista de recrutamento.

### Prompt/contexto

Contexto adicional da entrevista foi fornecido após a análise inicial do desafio:

- a UEX usa React/Next.js com frequência;
- Python é usado ocasionalmente;
- PHP/Laravel é central para a vaga alvo;
- o candidato informou explicitamente ao recrutamento que PHP é sua linguagem principal e Laravel é seu stack de backend mais forte.

### Contribuição da IA

Uma recomendação intermediária sugeriu usar Next.js/React/TypeScript como aplicação fullstack principal, em razão do uso de React/Next.js pela empresa.

### Revisão humana

O candidato contestou essa recomendação. Remover o Laravel criaria um descompasso entre:

- o núcleo da vaga;
- a expertise principal declarada pelo candidato durante a entrevista;
- a narrativa técnica apresentada aos avaliadores.

Esse feedback mudou materialmente a arquitetura.

### Correção/rejeição

**Rejeitado:** Next.js substituindo o Laravel como arquitetura principal de backend/aplicação.

A correção foi manter o Laravel como camada autoritativa de backend/domínio e usar Next.js/React/TypeScript como frontend dedicado consumindo a API REST do Laravel.

Python foi deliberadamente excluído do MVP porque nenhum requisito atual do Taskly justifica um serviço em Python. Adicioná-lo apenas para demonstrar outra linguagem aumentaria a complexidade sem valor de produto.

### Decisão final

```text
Next.js / React / TypeScript
            |
            | REST / JSON
            v
       PHP / Laravel
            |
            v
        PostgreSQL
```

Responsabilidades:

- Laravel: autenticação, autorização, validação, regras de negócio, persistência, uploads, API.
- Next.js: renderização, navegação, formulários, interações de Kanban/lista, experiência de produto responsiva.
- PostgreSQL: fonte de verdade relacional.

### Por que esta interação importa

Este é um exemplo em que o output da IA não foi aceito de imediato. O contexto humano de projeto/entrevista expôs uma fraqueza estratégica na recomendação inicial, e a arquitetura foi revisada antes da implementação.

### Arquivos/commits relacionados

- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/adr/001-use-monorepo.md`

---

## AI-003 — Redigir a especificação técnica pré-implementação

**Data:** 2026-09-14  
**Ferramenta/modelo:** ChatGPT com integração ao GitHub  
**Objetivo:** Converter os requisitos do desafio e a arquitetura acordada em uma especificação técnica pronta para implementação, antes do bootstrap dos frameworks.

### Prompt/contexto

A especificação precisava preservar o escopo obrigatório do desafio:

- autenticação própria por e-mail/senha;
- projetos;
- tarefas por projeto;
- título;
- descrição curta;
- descrição completa;
- prazo com data/hora;
- tags;
- anexos/fotos;
- campos de tarefa editáveis;
- visualizações em lista e Kanban;
- status: não iniciada, em andamento, concluída, cancelada.

Também foi pedido que a spec documentasse autorização, validação, testes, requisitos não funcionais, não-objetivos e Definition of Done, ainda sem instalar Laravel ou Next.js.

### Contribuição da IA

Gerou o `docs/SPEC.md` inicial e separou:

- requisitos obrigatórios;
- decisões de implementação propostas;
- não-objetivos;
- stretch goals;
- requisitos de segurança/autorização;
- estratégia de testes.

### Revisão humana

O documento deve ser revisado continuamente frente à implementação. Campos propostos como histórico de atividades estão explicitamente marcados como stretch goals, em vez de apresentados silenciosamente como requisitos do desafio.

### Correção/rejeição

Nenhum código de framework foi gerado nesta etapa. Isso foi deliberado: a especificação e a arquitetura precisam preceder, no histórico do repositório, as escolhas de implementação orientadas pelo framework.

### Decisão final

O repositório começa com commits de documentação/especificação. O bootstrap dos frameworks só vem depois que as decisões iniciais estão visíveis e revisáveis.

### Arquivos/commits relacionados

- `docs/SPEC.md`
- commit `606b57e` — `docs: define Taskly product and technical specification`

---

## Política de revisão para código gerado por IA

Antes de aceitar código gerado ou modificado por IA, a revisão deve considerar os itens relevantes abaixo:

### Correção

- O código implementa o requisito declarado?
- Ele introduz comportamento que não foi solicitado?
- Os casos de borda são tratados deliberadamente?

### Segurança

- A autenticação é exigida onde se espera?
- A autorização é feita no servidor?
- IDs de recurso podem ser trocados para acessar dados de outro usuário?
- Recursos aninhados estão delimitados aos seus pais?
- Uploads são validados com segurança?
- Segredos ou defaults inseguros foram introduzidos?

### Laravel

- As queries Eloquent estão corretamente delimitadas?
- O mass assignment está controlado?
- Form Requests/Policies são usados onde melhoram a clareza?
- Transações são necessárias?
- Relacionamentos/eager loading estão corretos?
- Funcionalidade do framework está sendo reimplementada sem necessidade?

### React / Next.js

- O estado no cliente é realmente necessário?
- Os Client Components estão limitados às fronteiras interativas, onde for prático?
- Rerenders/effects desnecessários foram introduzidos?
- A optimistic UI tem caminho de falha/rollback?
- Estados de erro/carregamento da API estão representados?

### Testes

- Os testes gerados verificam comportamento relevante, e não detalhes de implementação?
- Os testes de autorização tentam acesso entre usuários?
- Um teste gerado poderia passar enquanto o requisito real segue quebrado?

### Arquitetura

- A abstração proposta resolve um problema real e atual?
- Complexidade está sendo adicionada apenas porque a IA reconhece um padrão?
- Existe uma solução mais simples e nativa de Laravel/React?

---

## Princípio

> A IA pode propor código e decisões. O desenvolvedor permanece responsável por entender, validar, corrigir, testar e assumir o resultado final.
