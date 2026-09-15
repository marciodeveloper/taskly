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

## AI-004 — Localização pt-BR e revisão de acabamento

- **Data:** 2026-09-15
- **Ferramenta/modelo:** Claude Code — Opus / Medium
- **Objetivo:** Localizar a experiência do Taskly, o backend e a documentação para pt-BR, adicionar visibilidade de senha na autenticação e preservar arquitetura e contratos técnicos.

### Prompt/contexto

O produto já estava funcional e havia passado por rodadas de QA humano. O pedido foi explicitamente de acabamento, não de reescrita, com restrições diretas: não alterar regras de negócio, não alterar arquitetura e não introduzir abstrações desnecessárias.

O contexto de negócio é que a UEX é uma empresa brasileira, então a experiência do produto e a documentação destinada a pessoas deveriam estar em português do Brasil.

### Contribuição da IA

Auditoria do repositório antes de editar, seguida da implementação:

- componente `PasswordInput` reutilizável, com alternância Eye/EyeOff (lucide-react);
- localização completa da interface, incluindo textos ARIA, e formatação de datas com locale pt-BR;
- localização das mensagens do Laravel pelo mecanismo nativo (`lang/pt_BR/` e `APP_LOCALE`), sem condicionais de idioma espalhadas pelo código;
- tradução do README, SPEC, ARCHITECTURE, AI_USAGE e dos cinco ADRs.

A auditoria também levantou quatro itens que não faziam parte do pedido original:

1. `formatDateTime`/`formatDue` estavam duplicados em dois arquivos, ambos com locale `undefined`;
2. os labels de status estavam acoplados à `TaskWorkspace` e desciam por prop até o Kanban;
3. `feedback.startsWith("Unable")` governava o estilo de erro do feedback em dois pontos — traduzir as mensagens quebraria silenciosamente o retorno visual de erro;
4. o campo de senha do login usava `autocomplete="new-password"` em vez de `current-password`.

### Revisão humana

As quatro correções acima foram aceitas por terem causa técnica concreta, e não por preferência estética. O item 3 em particular era um defeito latente que só apareceria depois da tradução.

Decisões de fronteira mantidas na revisão:

- contratos técnicos permanecem em inglês: valores de enum, campos de payload, rotas, chaves JSON, nomes de classe, tabelas e migrations;
- apenas strings visíveis ao usuário foram para pt-BR;
- o mapa `attributes` do `validation.php` traduz o rótulo exibido sem alterar o nome do campo no payload.

### Correção/rejeição

**Rejeitado:** criar um link "Esqueci minha senha?" na interface. A restrição foi dada pelo humano e confirmada por inspeção: existe apenas a tabela `password_reset_tokens` do template padrão do Laravel, sem rotas nem controller. Um link sem backend seria um caminho morto. Foi registrado como melhoria futura no README.

**Rejeitado:** adicionar biblioteca de i18n. O produto é monolíngue e a introdução de `next-intl` ou equivalente seria mudança arquitetural, fora do escopo pedido.

**Corrigido — resultado de ferramenta não aceito de imediato:** o script de QA acusou três falhas nas mensagens de erro da autenticação. A investigação mostrou que o produto estava correto e o script é que estava errado: o Next.js em modo dev injeta um elemento `[role="alert"]` vazio, que o seletor capturava antes do alerta real. O seletor foi corrigido; nenhuma mudança foi feita no produto para "fazer o teste passar".

**Sinalizado para decisão humana:** o README declarava "No application framework has been bootstrapped yet" e listava como próximo marco um trabalho já concluído. Traduzir literalmente publicaria uma afirmação falsa em pt-BR. As seções de status e execução foram reescritas com fatos conferidos contra `docker-compose.yml` e os Dockerfiles, e o desvio da tradução literal foi reportado explicitamente em vez de aplicado em silêncio.

### Validação

- `npm run lint`: limpo;
- `npm run build`: OK;
- `php artisan test`: 76 testes, 327 asserções, todos passando;
- `git diff --check`: limpo;
- QA automatizado com Playwright, 40 verificações: autenticação, comportamento do Eye/EyeOff (independência entre senha e confirmação, preservação do valor, foco por teclado, não submissão), responsividade em 1440/768/390, Kanban com mouse e toque, drawers desktop e mobile, e varredura de inglês remanescente na interface.

Um único teste foi alterado: a asserção da mensagem de credenciais inválidas em `AuthenticationTest`, porque a mudança de idioma a tornou incorreta. A propriedade de segurança verificada — não revelar a existência da conta — permanece intacta.

### Decisão final

Localização aceita com a arquitetura preservada. Nenhum contrato de API, migration ou regra de negócio foi alterado. As correções de duplicação ficaram restritas a três módulos pequenos (`lib/format.ts`, `lib/tasks/status.ts`, `lib/feedback.ts`), sem introduzir camadas novas.

### Arquivos/commits relacionados

- commit `80dc0dc` — `feat(auth): adicionar controle de visibilidade de senha`
- commit `38d4062` — `feat(i18n): localizar interface do Taskly para pt-BR`
- commit `85121fc` — `fix(i18n): localizar mensagens do backend para pt-BR`
- commit `7a07050` — `style(auth): remover espaco morto abaixo dos campos`
- commit `e4c4f50` — `docs: traduzir documentacao tecnica para pt-BR`

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
