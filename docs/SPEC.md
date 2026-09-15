# Taskly — Especificação de Produto e Técnica

## 1. Visão geral

O Taskly é uma aplicação web de gestão pessoal de tarefas, construída para o desafio técnico de seleção da UEX. O produto permite que cada usuário autenticado crie e organize projetos, gerencie tarefas dentro desses projetos, alterne entre as visualizações de lista e Kanban, e acompanhe status, prazos, tags e anexos das tarefas.

Esta especificação foi escrita intencionalmente antes do bootstrap dos frameworks, para que a implementação siga um processo spec-driven claro e revisável.

## 2. Objetivos de produto

- Entregar o escopo mínimo completo solicitado pelo desafio, sem defeitos críticos.
- Oferecer uma experiência polida e responsiva, que pareça um produto real e não uma demo de CRUD.
- Manter uma fronteira técnica clara entre as responsabilidades de frontend e backend.
- Demonstrar autorização segura, validação, arquitetura manutenível, testes automatizados e desenvolvimento assistido por IA com rastreabilidade.
- Tornar a aplicação fácil de rodar localmente e direta de publicar.

## 3. Não-objetivos do MVP

As capacidades a seguir estão intencionalmente fora do escopo inicial, a menos que sobre tempo depois que a experiência obrigatória estiver completa e estável:

- Colaboração multiusuário dentro de um mesmo projeto.
- Workspaces de equipe, papéis ou gestão de organização.
- OAuth do Google ou da Microsoft.
- Sincronização multiusuário em tempo real.
- Chat, comentários, menções ou notificações.
- Aplicativos móveis nativos.
- Funcionalidades de IA dentro do produto para o usuário final.
- Dashboards complexos de relatórios ou analytics.

Esses itens podem ser documentados como evolução futura, mas não podem comprometer a entrega do escopo obrigatório.

## 4. Arquitetura alvo

A aplicação usará um monorepo com duas aplicações principais:

- `apps/api`: backend PHP/Laravel responsável por autenticação, autorização, validação, regras de negócio, persistência, uploads e a API REST.
- `apps/web`: frontend Next.js/React/TypeScript responsável por renderização, navegação, formulários, interações de lista/Kanban, optimistic UI e a experiência do usuário como um todo.

O PostgreSQL é a fonte de verdade dos dados persistidos da aplicação.

O frontend não deve se conectar diretamente ao PostgreSQL. Todas as operações de domínio passam pela aplicação Laravel.

## 5. Jornadas principais do usuário

### 5.1 Cadastro e autenticação

Um visitante pode:

1. Abrir a página de cadastro.
2. Cadastrar-se com nome, e-mail e senha.
3. Ficar autenticado após o cadastro bem-sucedido.
4. Sair da conta.
5. Voltar depois e entrar usando e-mail e senha.
6. Manter uma sessão autenticada conforme o tempo de vida de sessão configurado.

OAuth não é obrigatório.

### 5.2 Gestão de projetos

Um usuário autenticado pode:

1. Ver seus projetos.
2. Criar um novo projeto.
3. Renomear/editar um projeto.
4. Organizar múltiplos projetos.
5. Selecionar um projeto e ver apenas as tarefas pertencentes a ele.
6. Excluir um projeto após confirmação explícita.

Um usuário nunca pode ler ou modificar os projetos de outro usuário.

### 5.3 Gestão de tarefas

Dentro de um projeto, um usuário autenticado pode criar uma tarefa com:

- título;
- descrição curta;
- descrição completa;
- prazo contendo data e hora;
- tags;
- anexos e/ou fotos;
- status.

Todo campo da tarefa deve continuar editável depois da criação.

Os status permitidos são:

- `not_started` — Não iniciada;
- `in_progress` — Em andamento;
- `completed` — Concluída;
- `cancelled` — Cancelada.

O usuário pode atualizar o status da tarefa a qualquer momento.

### 5.4 Visualizações de lista e Kanban

Para um projeto selecionado, o usuário pode alternar entre:

- visualização em Lista;
- visualização em Kanban.

Um controle visível comanda a visualização ativa.

As colunas do Kanban mapeiam os quatro status de tarefa. Mover um cartão entre colunas atualiza seu status. Reordenar dentro de uma coluna pode persistir a posição da tarefa, se isso for incluído na implementação.

## 6. Requisitos funcionais

### FR-001 — Cadastro

O sistema deve permitir a criação de conta usando e-mail e senha, sem autenticação de terceiros obrigatória.

Critérios de aceite:

- o e-mail deve ser único;
- a senha deve satisfazer os requisitos mínimos configurados;
- entradas inválidas retornam feedback de validação por campo;
- um cadastro bem-sucedido cria exatamente uma conta de usuário;
- a senha nunca é armazenada em texto puro.

### FR-002 — Login e sessão persistente

O sistema deve autenticar um usuário existente usando e-mail e senha e manter uma sessão segura.

Critérios de aceite:

- credenciais válidas criam uma sessão autenticada;
- credenciais inválidas não revelam se uma conta existe, além de mensagens de validação seguras;
- rotas autenticadas rejeitam requisições não autenticadas;
- o logout invalida a sessão ativa.

### FR-003 — CRUD de projetos

O usuário deve poder criar, listar, editar, organizar e excluir seus próprios projetos.

Critérios de aceite:

- projetos são sempre delimitados ao usuário autenticado;
- o nome do projeto é obrigatório;
- a exclusão de projeto exige confirmação explícita na interface;
- excluir um projeto trata as tarefas associadas conforme a estratégia de relacionamento do banco.

### FR-004 — CRUD de tarefas

O usuário deve poder criar, ler, editar e excluir tarefas pertencentes aos seus próprios projetos.

Critérios de aceite:

- o título é obrigatório;
- a descrição curta suporta um texto de resumo conciso;
- a descrição completa suporta conteúdo mais longo;
- o prazo aceita data e hora;
- o status deve ser um dos quatro valores permitidos;
- todos os campos podem ser editados após a criação da tarefa;
- a propriedade do projeto é verificada em toda operação de tarefa.

### FR-005 — Tags

O usuário deve poder atribuir uma ou mais tags a uma tarefa.

Critérios de aceite:

- uma tarefa pode ter múltiplas tags;
- as tags apresentadas ao usuário são adequadamente delimitadas a ele;
- atribuir uma tag pertencente a outro usuário não é permitido.

### FR-006 — Anexos e fotos

O usuário deve poder anexar arquivos e/ou imagens suportados a uma tarefa.

Critérios de aceite:

- uploads são validados quanto a MIME types permitidos e tamanho máximo;
- os nomes de arquivo armazenados não podem depender de caminhos inseguros fornecidos pelo usuário;
- usuários acessam apenas anexos pertencentes a tarefas que estão autorizados a acessar;
- anexos podem ser removidos de uma tarefa.

### FR-007 — Visualização em lista

As tarefas do projeto selecionado devem estar disponíveis em uma visualização em lista clara.

A lista deve expor informação suficiente para leitura rápida, incluindo no mínimo título e status, com prazo e tags quando disponíveis.

### FR-008 — Visualização em Kanban

As tarefas do projeto selecionado devem estar disponíveis em uma visualização Kanban agrupada por status.

Critérios de aceite:

- as quatro colunas de status obrigatórias estão representadas;
- mover uma tarefa entre colunas altera o status persistido;
- a interface lida com falha de requisição sem deixar o cliente em um estado incorreto.

### FR-009 — Alternância de visualização

O usuário deve poder alternar entre lista e Kanban sem perder o contexto do projeto selecionado.

## 7. Regras de domínio

- Um `User` é dono de muitos `Projects`.
- Um `Project` pertence a exatamente um `User`.
- Um `Project` é dono de muitas `Tasks`.
- Uma `Task` pertence a exatamente um `Project`.
- Uma `Task` pode ter zero ou muitas `Tags`.
- Uma `Task` pode ter zero ou muitos `Attachments`.
- A autorização é baseada em propriedade através da relação project/user.
- O acesso à tarefa precisa ser delimitado pelo projeto pai ou, de outra forma, aplicar verificações de propriedade equivalentes.
- `completed_at` pode ser registrado quando uma tarefa é concluída e limpo quando ela sai do estado concluído.

## 8. Modelo de dados proposto

### users

Model de usuário da autenticação do Laravel.

Campos principais:

- id
- name
- email
- password
- timestamps

### projects

- id
- user_id
- name
- description nullable
- color nullable
- position nullable
- timestamps

Os índices devem suportar a recuperação de projetos delimitada por propriedade.

### tasks

- id
- project_id
- title
- short_description nullable
- description nullable
- status
- due_at nullable
- position nullable
- completed_at nullable
- timestamps

Os índices devem suportar queries por project/status e queries orientadas a prazo quando útil.

### tags

- id
- user_id
- name
- color nullable
- timestamps

### task_tag

Relação pivô entre tasks e tags.

### attachments

- id
- task_id
- original_name
- storage_path
- mime_type
- size
- timestamps

### activity_logs (stretch goal)

Se implementada depois que o escopo obrigatório estiver estável:

- id
- user_id
- subject_type
- subject_id
- action
- metadata JSON/JSONB nullable
- created_at

Esta tabela existe para dar rastreabilidade a mudanças relevantes de domínio.

## 9. Fronteira da API

A aplicação Laravel é o backend autoritativo. A aplicação Next.js consome uma API REST/JSON.

Espera-se que a superfície inicial da API inclua endpoints equivalentes a:

- endpoints de autenticação/sessão;
- usuário autenticado atual;
- endpoints de coleção/resource de projetos;
- tarefas delimitadas por projeto;
- endpoints de atualização/exclusão de resource de tarefa;
- atualizações explícitas de status e/ou ordenação de tarefa, onde úteis;
- tags;
- anexos de tarefa.

As rotas e os payloads exatos serão documentados após o bootstrap do Laravel e antes da integração com o frontend.

As respostas da API devem usar formatos de resource estáveis e códigos de status HTTP apropriados.

## 10. Estratégia de autenticação

O Laravel Sanctum é o mecanismo de autenticação pretendido para o cliente web first-party.

Abordagem preferencial:

- autenticação baseada em sessão/cookie seguro HTTP-only;
- proteção CSRF;
- nenhuma implementação de JWT própria, a menos que uma restrição concreta de deploy exija.

Os detalhes de autenticação serão finalizados em um ADR antes da implementação.

## 11. Regras de autorização

A autorização é obrigatória em todo recurso privado.

No mínimo:

- usuários só podem listar seus próprios projetos;
- usuários só podem ver/atualizar/excluir seus próprios projetos;
- usuários só podem criar tarefas dentro de projetos que possuem;
- usuários só podem ver/atualizar/excluir tarefas cujo projeto lhes pertence;
- recursos aninhados precisam verificar tanto a propriedade do pai quanto o relacionamento com o filho;
- usuários só podem acessar anexos de tarefas que estão autorizados a acessar;
- usuários não podem anexar a tag de outro usuário a uma tarefa.

Possíveis caminhos de IDOR/escalonamento horizontal de privilégio precisam estar cobertos por testes automatizados.

## 12. Regras de validação

Os limites detalhados podem ser ajustados durante a implementação, mas a linha de base é:

- nome do projeto: obrigatório, com trim, comprimento limitado;
- título da tarefa: obrigatório, com trim, comprimento limitado;
- descrição curta: opcional, texto conciso limitado;
- descrição: texto opcional;
- status: enum estrito dos quatro valores suportados;
- prazo: data/hora válida quando presente;
- tags: identificadores validados, pertencentes ao usuário autenticado;
- anexos: MIME type e tamanho máximo de arquivo validados;
- caminhos e nomes de arquivo enviados são gerados/normalizados no servidor.

As regras de validação precisam ser autoritativas no Laravel. O frontend pode duplicar validação segura por experiência do usuário, mas não pode ser a fronteira de segurança.

## 13. Requisitos de UX

- Layout responsivo para larguras de desktop e mobile.
- Troca rápida de projeto.
- Estados vazios claros para contas/projetos novos.
- Labels acessíveis e controles navegáveis por teclado onde for prático.
- Feedback visível de carregamento, sucesso e falha.
- A criação de tarefa deve exigir navegação mínima.
- Os detalhes da tarefa podem usar um painel lateral/drawer para manter o contexto do projeto visível.
- As interações de Kanban devem parecer imediatas; atualizações otimistas são preferidas quando o comportamento de rollback é implementado com segurança.
- Prazos vencidos devem ser visualmente distinguíveis sem depender apenas de cor.

## 14. Requisitos não funcionais

### Segurança

- O hash de senha usa os padrões do Laravel.
- A proteção CSRF permanece habilitada para autenticação stateful.
- A autorização precisa ser feita no servidor.
- Nenhum segredo é commitado no Git.
- Uploads de arquivo são validados e armazenados com segurança.
- As fronteiras de mass assignment são explícitas.

### Performance

- Evitar queries N+1 óbvias.
- Usar eager loading onde relacionamentos são exibidos em coleções.
- Evitar JavaScript e rerenders desnecessários no cliente.
- Paginar ou limitar coleções grandes de outra forma, caso a implementação evolua além de um conjunto pequeno de dados de demonstração.

### Manutenibilidade

- Controllers/route handlers permanecem enxutos.
- Operações de negócio são organizadas em actions/services adequadamente delimitados quando a complexidade justificar.
- A validação no Laravel usa Form Requests ou validadores focados equivalentes.
- A autorização usa Policies e/ou queries explicitamente delimitadas por propriedade.
- Componentes React separam primitivos de UI do comportamento específico de cada funcionalidade.
- A rigidez do TypeScript deve ser preservada.

### Observabilidade

Para o escopo do desafio, os logs da aplicação precisam ser suficientes para diagnosticar erros de backend. Eventos estruturados de aplicação/histórico de atividade são melhorias opcionais, não pré-requisitos para concluir o MVP.

## 15. Estratégia de testes

Os testes priorizarão risco de negócio, e não um percentual arbitrário de cobertura.

### Backend

Os testes automatizados devem cobrir no mínimo:

- comportamento de cadastro/login/logout;
- usuário A não acessa os projetos do usuário B;
- usuário A não acessa as tarefas do usuário B;
- aplicação da propriedade em tarefas/projetos aninhados;
- caminhos felizes do CRUD de projetos;
- caminhos felizes do CRUD de tarefas;
- transições/valores de status de tarefa permitidos e inválidos;
- validação de propriedade de tag;
- validação e autorização de anexos.

### Frontend

Os testes devem focar em interação e comportamento de estado relevantes, incluindo a alternância entre lista/Kanban e o comportamento pertinente dos formulários.

### End-to-end

Um fluxo em Playwright deve cobrir a jornada principal de produto quando for prático:

1. cadastrar/entrar;
2. criar um projeto;
3. criar uma tarefa;
4. editar a tarefa;
5. mover/atualizar o status da tarefa;
6. alternar entre lista e Kanban;
7. sair.

## 16. Requisitos de engenharia assistida por IA

Ferramentas de IA podem ser usadas para implementação, refatoração, geração de testes, revisão de arquitetura, revisão de segurança e documentação.

O output da IA nunca é considerado autoritativo por si só.

As interações relevantes precisam ser registradas em `docs/AI_USAGE.md` com:

- ferramenta/modelo quando relevante;
- tarefa/objetivo;
- prompt ou prompt resumido;
- output útil;
- revisão humana;
- correções/rejeições;
- decisão final.

Atenção especial deve ser dada a documentar os casos em que o output da IA foi incompleto, inseguro, incorreto ou desnecessariamente complexo.

## 17. Definition of Done — escopo obrigatório

O escopo obrigatório é considerado completo apenas quando:

- o cadastro funciona;
- o login funciona;
- a persistência de sessão funciona;
- o logout funciona;
- projetos podem ser criados, visualizados, editados, organizados e excluídos;
- tarefas podem ser criadas e totalmente editadas;
- título, descrição curta, descrição completa, prazo, tags, anexos/fotos e status da tarefa são suportados;
- os quatro status obrigatórios são suportados;
- a visualização em lista funciona;
- a visualização em Kanban funciona;
- a alternância de visualização funciona;
- a autorização impede acesso entre usuários;
- a validação obrigatória é aplicada no servidor;
- nenhum bug crítico conhecido bloqueia o fluxo principal;
- testes automatizados protegem o comportamento de domínio/segurança mais importante;
- o README documenta como rodar o projeto;
- o uso de IA está documentado;
- as decisões de arquitetura estão documentadas.

## 18. Stretch goals

Somente depois que o escopo obrigatório estiver estável:

- persistência de drag-and-drop e refinamento do rollback otimista;
- busca e filtros de tarefa;
- indicadores de atraso;
- resumo de progresso do projeto;
- histórico de atividade;
- pré-visualizações de imagem polidas;
- conta/dados de demonstração via seed;
- documentação OpenAPI;
- pipeline de CI;
- ambiente publicado.

O trabalho de stretch não pode reduzir a confiabilidade do escopo obrigatório.

## 19. Decisões em aberto

As decisões a seguir serão registradas em ADRs antes que sua implementação se torne difícil de reverter:

- organização do monorepo;
- fronteira de responsabilidade entre Laravel e Next.js;
- topologia de autenticação com Sanctum e premissas de domínio no deploy;
- estratégia de storage para anexos;
- biblioteca de drag-and-drop do Kanban;
- contrato REST exato dos resources;
- estratégia de CI/deploy.
