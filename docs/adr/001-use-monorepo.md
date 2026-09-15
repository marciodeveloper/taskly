# ADR-001 — Usar um monorepo para o Taskly

## Status

Aceito.

## Contexto

O Taskly é um produto só com dois runtimes de aplicação:

- um backend Laravel/PHP;
- um frontend Next.js/React/TypeScript.

O desafio técnico tem uma janela de entrega curta e exige que o código-fonte completo, a documentação, os prompts e as decisões de arquitetura sejam fáceis de revisar.

Usar repositórios separados adicionaria custo de coordenação sem trazer benefício real de produto para este escopo.

## Decisão

O Taskly usará um único repositório Git contendo as duas aplicações e a documentação compartilhada do projeto.

Layout alvo:

```text
taskly/
├── apps/
│   ├── api/
│   └── web/
├── docs/
├── .github/
├── docker/
├── docker-compose.yml
└── README.md
```

## Consequências

### Positivas

- um clone contém o case técnico completo;
- mudanças de frontend e backend podem ser revisadas juntas;
- a CI pode validar as duas aplicações a partir de uma única fronteira de workflow;
- a documentação e os registros de desenvolvimento assistido por IA ficam próximos do código que descrevem;
- a orquestração local com Docker fica mais simples de explicar e operar;
- preparar release/demo fica mais fácil dentro do prazo do desafio.

### Trade-offs

- o repositório contém ecossistemas e gerenciadores de dependência diferentes;
- os jobs de CI precisam ser delimitados para que os pipelines de PHP e Node permaneçam independentes;
- o tooling deve evitar assumir que todos os pacotes compartilham um mesmo runtime.

## Alternativas consideradas

### Repositórios separados `taskly-api` e `taskly-web`

Rejeitada para este desafio porque adiciona custo de repositório, versionamento, documentação e revisão sem que haja requisito de propriedade ou ciclos de release independentes.

### Repositório apenas Laravel com frontend renderizado no servidor

Rejeitada porque a arquitetura alvo demonstra intencionalmente o Laravel como camada de backend/domínio e o Next.js/React como camada de produto no frontend.

## Gatilho de revisão

Revisitar esta decisão apenas se o produto evoluir para serviços com propriedade e deploy independentes, em que a separação de repositórios gere valor operacional ou organizacional mensurável.
