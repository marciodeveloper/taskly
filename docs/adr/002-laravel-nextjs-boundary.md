# ADR-002 — O Laravel é dono do domínio; o Next.js é dono da UI do produto

## Status

Aceito.

## Contexto

O Taskly precisa demonstrar capacidade fullstack sênior e, ao mesmo tempo, ser entregável dentro da janela curta de um desafio técnico.

Restrições e contexto relevantes:

- PHP/Laravel é o stack de backend principal do candidato e é central para a vaga alvo.
- A UEX usa React/Next.js com frequência, conforme o contexto da entrevista de recrutamento.
- O desafio valoriza explicitamente implementação fullstack, APIs, qualidade de código, arquitetura e decisões técnicas.
- Usar o Next.js como autoridade de banco de dados/backend sub-representaria a experiência com Laravel.
- Usar apenas UI renderizada pelo Laravel não demonstraria o alinhamento com React/Next.js discutido na entrevista.

## Decisão

O Laravel é o backend de aplicação/domínio autoritativo.

O Next.js é a aplicação frontend dedicada e consome o Laravel através de uma fronteira REST/JSON.

### O Laravel é dono de

- comportamento de autenticação/sessão;
- autorização;
- validação;
- regras de negócio;
- persistência;
- propriedade de tasks/projects;
- tags;
- anexos;
- contratos/resources da API;
- logging de backend e segurança no servidor.

### O Next.js é dono de

- rotas/layouts e o shell da aplicação;
- renderização de UI;
- navegação entre projetos;
- formulários de task;
- apresentação em list/Kanban;
- drag-and-drop e interações no cliente;
- optimistic UI onde fizer sentido;
- comportamento responsivo e de acessibilidade;
- cliente de API do frontend e estado de apresentação.

### Fronteira com o PostgreSQL

O Next.js não deve acessar o PostgreSQL diretamente.

Toda mutação de domínio e toda leitura protegida é autorizada e processada pelo Laravel.

## Consequências

### Positivas

- PHP/Laravel permanece central na narrativa de implementação e na profundidade de engenharia.
- A experiência com React/Next.js é demonstrada usando uma fronteira de frontend real, e não componentes decorativos.
- A API REST se torna um contrato de aplicação genuíno.
- A autorização de backend permanece centralizada e testável de forma independente.
- As responsabilidades de frontend e backend continuam explicáveis durante a revisão técnica.

### Trade-offs

- dois runtimes precisam ser configurados e publicados;
- a topologia de autenticação/sessão entre frontend e backend exige configuração deliberada;
- contratos de API podem divergir se tipos, testes e revisão não os mantiverem alinhados;
- Docker e CI precisam suportar os ecossistemas PHP e Node.

## Alternativas consideradas

### Next.js fullstack apenas

Rejeitada. Simplificaria o deploy, mas removeria o Laravel do núcleo da arquitetura, apesar de sua relevância para a vaga e para o perfil do candidato.

### Laravel apenas com Blade/Livewire

Rejeitada para este desafio. É uma arquitetura de produto válida, mas não demonstraria o ambiente React/Next.js discutido na entrevista de recrutamento.

### API Laravel + SPA React separada sem Next.js

Viável, mas o Next.js foi escolhido por se alinhar melhor ao contexto tecnológico informado pela UEX e por oferecer um ambiente estruturado e moderno de aplicação React.

## Guardrails

- Não colocar autorização apenas no Next.js.
- Não duplicar regras de domínio como fontes de verdade concorrentes.
- Não introduzir lógica de backend no Next.js apenas para evitar uma chamada de API.
- Não criar abstrações no Laravel que existam apenas para parecer arquiteturalmente sofisticadas.
- Preferir contratos explícitos e testáveis a acoplamento implícito.

## Gatilho de revisão

Revisitar se algum requisito concreto tornar a fronteira HTTP materialmente prejudicial, ou se restrições de deploy provarem que a integração stateful entre frontend e backend é impraticável. Qualquer revisão deve preservar a propriedade de domínio e segurança no servidor.
