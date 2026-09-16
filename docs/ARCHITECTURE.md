# Taskly — Arquitetura

## 1. Intenção arquitetural

O Taskly foi desenhado como um produto fullstack pequeno e com mentalidade de produção, e não como uma demo de CRUD em um framework só.

A arquitetura mantém deliberadamente PHP/Laravel como backend e camada de domínio autoritativos, enquanto usa Next.js/React/TypeScript para a experiência do usuário.

Essa divisão reflete três objetivos:

1. manter regras de negócio, autorização, validação, persistência e comportamento da API centralizados no Laravel;
2. usar Next.js/React para um frontend interativo e polido, alinhado a um stack de produto moderno;
3. manter as fronteiras explícitas o bastante para serem testáveis e explicáveis dentro de um desafio técnico de três dias.

## 2. Visão geral

```text
Browser
  |
  v
Next.js / React / TypeScript
  |
  | HTTPS + JSON
  v
Laravel REST API
  |
  +--> Authentication / Sanctum
  +--> Authorization / Policies
  +--> Validation / Form Requests
  +--> Application Actions / Services
  +--> File Storage
  +--> Logging
  |
  v
PostgreSQL
```

O frontend nunca acessa o PostgreSQL diretamente.

## 3. Layout do repositório

Estrutura alvo do monorepo:

```text
taskly/
├── apps/
│   ├── api/              # Aplicação Laravel
│   └── web/              # Aplicação Next.js
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── AI_USAGE.md
│   └── adr/
├── .github/
│   └── workflows/
├── docker/
├── docker-compose.yml
└── README.md
```

Os diretórios de framework não são criados intencionalmente até que a especificação e as decisões iniciais de arquitetura existam no histórico do Git.

## 4. Responsabilidades do backend — Laravel

O Laravel é a fonte de verdade do comportamento da aplicação.

Ele é dono de:

- cadastro, login, logout e comportamento de sessão autenticada;
- identidade do usuário;
- propriedade de projetos e tarefas;
- todas as decisões de autorização;
- validação de requisições;
- regras de status de tarefa;
- persistência;
- tags e relacionamentos task/tag;
- autorização de upload/download de anexos;
- logging de atividade/eventos onde implementado;
- contratos de resource da API REST;
- testes automatizados de backend.

O backend deve permanecer seguro mesmo que a validação do frontend seja completamente contornada.

## 5. Responsabilidades do frontend — Next.js

O Next.js é dono da experiência de produto.

Ele é responsável por:

- rotas e layouts;
- shell autenticado da aplicação;
- navegação entre projetos;
- visualização de tarefas em lista;
- visualização de tarefas em Kanban;
- formulários e feedback por campo;
- estados de carregamento/erro/vazio;
- comportamento responsivo;
- interações de drag-and-drop;
- optimistic UI onde o rollback é seguro;
- definições de tipos do frontend e o cliente de API;
- testes de frontend e end-to-end quando aplicável.

O frontend não deve duplicar regras de negócio do backend como autoridade. A validação no cliente existe por usabilidade; a validação do Laravel permanece autoritativa.

## 6. Fronteira da API

A comunicação entre `apps/web` e `apps/api` usa HTTP/JSON.

A API deve favorecer semântica REST convencional:

- endpoints de coleção para projects/tasks/tags;
- endpoints de resource para leituras/atualizações/exclusões;
- endpoints aninhados de project/task onde a relação com o pai melhora a clareza da autorização;
- endpoints explícitos de status/reorder apenas quando resultarem em um contrato mais claro do que atualizações genéricas de resource.

Os payloads da API devem ser transformados por Laravel Resources ou serializadores estáveis equivalentes, em vez de expor serialização arbitrária de model.

## 7. Autenticação

A estratégia preferencial é Laravel Sanctum com autenticação stateful por sessão e cookie seguro HTTP-only para o frontend Next.js first-party.

Motivos:

- cliente de navegador first-party;
- integração nativa com o Laravel;
- proteção CSRF;
- menor exposição de token no JavaScript do navegador;
- comportamento direto de revogação/sessão;
- nenhum requisito de produto justifica a complexidade de um JWT próprio.

A topologia final de deploy usa um único origin público, `https://taskly.webarthem.com.br`, com Nginx roteando frontend e backend. Essa escolha reduz a superfície de CORS e mantém Sanctum, cookies e CSRF no mesmo origin.

### Recuperação de senha

A redefinição de senha usa o Password Broker nativo do Laravel: o backend é dono da geração, expiração e invalidação do token, sem esquema próprio.

A consequência arquitetural é que o e-mail é enviado pelo Laravel, mas o formulário vive no Next.js. O link é montado por `ResetPassword::createUrlUsing` a partir de `FRONTEND_URL`, de modo que a fronteira entre as duas aplicações continue explícita e configurável por ambiente, sem URL fixa espalhada pelo código.

A solicitação responde sempre a mesma mensagem, independentemente de o endereço estar cadastrado, e a resposta de erro do reset não distingue token inválido de usuário inexistente. Os dois casos existem para evitar enumeração de contas.

## 8. Modelo de autorização

A propriedade flui pela relação com o projeto:

```text
User
  |
  +--> Project
          |
          +--> Task
                  |
                  +--> Attachment
```

As tags também são delimitadas por usuário.

A autorização deve combinar:

- Laravel Policies para habilidades explícitas sobre cada resource;
- queries delimitadas por propriedade para recursos aninhados;
- testes cobrindo cenários de escalonamento horizontal de privilégio/IDOR.

Uma URL contendo IDs de resource válidos nunca pode ser suficiente para autorizar acesso.

## 9. Camada de aplicação/serviço

O projeto deve evitar os dois extremos:

- controllers contendo toda a lógica de negócio;
- abstrações corporativas desnecessárias para um CRUD simples.

Padrão de referência:

```text
HTTP request
   |
   v
Form Request
   |
   v
Controller
   |
   v
Action / Service (quando o comportamento não é trivial)
   |
   +--> Policy / autorização
   +--> transação se necessário
   +--> models Eloquent
   +--> efeitos colaterais / log de atividade
   |
   v
API Resource
```

Operações simples podem permanecer concisas nos controllers quando extraí-las não melhoraria a clareza.

## 10. Camada de dados

O PostgreSQL é o banco relacional escolhido.

O Eloquent permanece como abstração primária de persistência.

Regras de acesso a dados:

- relacionamentos devem ser explícitos;
- chaves estrangeiras e índices suportam queries de propriedade/status/prazo;
- evitar queries N+1;
- usar transações de banco para mudanças de estado em múltiplas etapas quando a consistência exigir;
- preferir constraints de banco onde elas protegem invariantes de forma confiável.

Nenhuma abstração de repository pattern será adicionada a menos que uma necessidade concreta de implementação a justifique.

## 11. Modelo de status de tarefa

Valores canônicos do backend:

- `not_started`
- `in_progress`
- `completed`
- `cancelled`

Enums tipados do PHP são preferidos se suportados naturalmente pela versão de Laravel/PHP escolhida.

Quando o status muda para completed, o backend pode definir `completed_at`. Quando uma tarefa concluída sai desse estado, `completed_at` deve ser limpo.

## 12. Comportamento do Kanban

A UI de Kanban mapeia uma coluna para cada status canônico de tarefa.

Interação esperada:

```text
arrastar o cartão
   |
   v
atualização otimista da UI
   |
   v
requisição à API Laravel
   |
   +--> validação
   +--> autorização
   +--> persistência
   |
   v
sucesso -> manter o estado
falha -> rollback + feedback ao usuário
```

Comportamento otimista é um aprimoramento, não permissão para sacrificar correção.

## 13. Upload de arquivos

O Laravel é dono da validação e do armazenamento de uploads.

Regras de segurança:

- validar MIME type e tamanho no servidor;
- nunca confiar em caminhos vindos do cliente;
- gerar caminhos/nomes de armazenamento seguros;
- autorizar leitura/exclusão de anexos pela propriedade da tarefa;
- evitar que anexos privados de tarefa sejam publicamente enumeráveis por padrão.

Em produção, os anexos privados ficam em volume Docker persistente montado em `storage/app/private/task-attachments`, preservando os arquivos entre recriações do container da API.

## 14. Arquitetura de testes

### Backend

Pest ou PHPUnit cobrirão:

- comportamento de feature/API;
- fronteiras de autorização;
- validação;
- propriedade de recursos;
- comportamento de status/domínio de tarefa;
- segurança de anexos.

### Frontend

Vitest/React Testing Library podem cobrir comportamento pontual de componentes e estado, onde isso trouxer confiança útil.

### End-to-end

O Playwright é preferido para a jornada principal de produto atravessando a fronteira real entre frontend e backend.

A estratégia prioriza risco e comportamento, em vez de perseguir um percentual arbitrário de cobertura.

## 15. Docker e desenvolvimento local

A topologia para local/desenvolvimento usa Docker Compose com serviços separados para:

- web;
- api;
- PostgreSQL;
- Mailpit, para inspecionar e-mails em desenvolvimento.

O Mailpit é infraestrutura de desenvolvimento e não faz parte do deploy de produção.

Uma pessoa contribuindo consegue subir a aplicação completa a partir do README do repositório sem depender de instalações específicas de PHP/Node/PostgreSQL no host.

## 16. CI/CD e topologia de produção

O workflow versionado em `.github/workflows/ci-cd.yml` está operacional com um runner **self-hosted, Linux/X64 e escopado ao repositório** na mesma VPS que hospeda a produção.

A pipeline separa as validações em três frentes independentes:

- **backend:** build de uma imagem de CI isolada, execução de `php artisan test` e `Pint`;
- **frontend:** build da imagem de desenvolvimento, `npm run lint` e `npm run build`;
- **produção:** validação do `docker-compose.prod.yml` e build das imagens finais de API e web com tags temporárias de CI.

Como o repositório é público e o runner possui acesso ao Docker/host, jobs disparados por pull requests de forks são explicitamente ignorados. O workflow não usa `pull_request_target`; código não confiável vindo de forks não é executado no runner da VPS.

O job de deploy depende das três validações anteriores e só pode ocorrer em `main`: por push após merge ou por `workflow_dispatch` explícito na branch principal. O deploy publica exatamente o `GITHUB_SHA` que passou no CI, em vez de implantar o estado genérico da branch.

Fluxo efetivo:

```text
push/merge em main
        |
        +--> backend tests + Pint
        |
        +--> frontend lint + build
        |
        +--> production compose + image builds
                    |
                    v
            deploy do SHA exato
                    |
                    +--> migrations --force
                    +--> health checks internos
                    +--> smoke tests públicos HTTPS
```

O script `scripts/deploy-production.sh` recebe obrigatoriamente um SHA completo de 40 caracteres, usa lock para impedir deploys concorrentes, valida o `.env.production`, exige `APP_ENV=production`, `APP_DEBUG=false`, cookie seguro, chave Laravel válida, senha forte de banco e portas esperadas, e recusa sobrescrever um checkout de produção com alterações locais rastreadas.

Depois das validações, o script faz fetch e checkout detached do SHA solicitado, valida o Compose, constrói as imagens, garante o PostgreSQL saudável, executa migrations com `--force`, sobe API e web e executa health checks internos. O próprio workflow conclui com smoke tests públicos em HTTPS para `/`, `/login`, `/register`, `/up` e `/sanctum/csrf-cookie`.

A primeira publicação do projeto foi inicializada manualmente por SHA exato porque os GitHub-hosted runners estavam indisponíveis por um bloqueio externo da conta. Esse bootstrap histórico foi posteriormente substituído pelo fluxo self-hosted descrito acima. A pipeline já foi validada de ponta a ponta em `main`, incluindo o deploy automático de um SHA aprovado pelo CI e os smoke tests públicos pós-deploy.

A topologia efetiva de produção é:

```text
Internet
   |
   | HTTPS
   v
Nginx
   |
   +--> /, frontend
   |       |
   |       v
   |   Next.js
   |   127.0.0.1:13080
   |
   +--> /api, /sanctum, /up
           |
           v
       Laravel
       127.0.0.1:18081
           |
           v
       PostgreSQL
       rede Docker interna
```

Características operacionais:

- origem pública única: `https://taskly.webarthem.com.br`;
- Nginx é a única entrada HTTP/HTTPS da aplicação;
- Next.js e Laravel ficam vinculados somente ao loopback do host;
- PostgreSQL não publica porta no host;
- banco e anexos usam volumes Docker persistentes dedicados;
- `APP_ENV=production` e `APP_DEBUG=false` no ambiente publicado;
- TLS emitido por Let's Encrypt/Certbot, com renovação automática configurada;
- HTTP é redirecionado para HTTPS;
- Mailpit não existe em produção;
- o ambiente público atual usa `MAIL_MAILER=log`, então recuperação externa por e-mail depende de SMTP real.

O checkout de produção vive separado do diretório de desenvolvimento e a pipeline não depende de credenciais SSH de deploy armazenadas no GitHub, pois o runner executa o script localmente na VPS. O SHA do workflow continua sendo a unidade de publicação.

## 17. Fronteira da engenharia assistida por IA

Ferramentas de IA fazem parte do fluxo de engenharia, mas nunca são donas de decisões de arquitetura ou de segurança.

A IA pode auxiliar em:

- implementação;
- geração de testes;
- refatoração;
- code review;
- revisão de segurança;
- documentação.

A revisão humana permanece obrigatória, e as interações/correções relevantes ficam registradas em `docs/AI_USAGE.md`.

## 18. Trade-offs explícitos

### Runtimes separados de Laravel e Next.js

Custo:

- mais superfície de deploy/configuração;
- a configuração de cross-origin/sessão precisa estar correta;
- dois sistemas de build.

Benefício:

- responsabilidades claras de frontend e backend;
- implementação genuína de API REST;
- demonstra integração fullstack entre as tecnologias escolhidas para o desafio;
- o backend permanece testável e reutilizável de forma independente.

### Sem serviço em Python no MVP

Python não é introduzido apenas para demonstrar outra linguagem. O MVP do Taskly não tem problema de domínio que justifique um serviço em Python.

Se requisitos futuros trouxerem processamento de documentos, cargas de IA/NLP, pipelines analíticos ou processamento em background especializado, um worker/serviço em Python poderá ser avaliado então.

### Sem microsserviços prematuros

O produto é um gerenciador pessoal de tarefas pequeno. O Laravel permanece como um backend monolítico modular. Dividir capacidades de domínio em serviços durante este desafio adicionaria complexidade operacional sem valor de produto correspondente.

## 19. Princípios de evolução

Mudanças futuras devem preservar estes princípios:

- regras de domínio/segurança permanecem no servidor;
- contratos entre frontend e backend são explícitos;
- nova tecnologia exige justificativa de produto ou de engenharia;
- evitar abstrações sem pressão concreta;
- preferir comportamento observável e testável;
- a arquitetura deve continuar explicável em uma revisão técnica.
