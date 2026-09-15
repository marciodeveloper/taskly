# ADR-005 — Armazenar anexos de tarefas em storage privado do Laravel

## Status

Aceito.

## Data

2026-09-15

## Contexto

Anexos de tarefas contêm dados privados do usuário. O Taskly executa Laravel e Next.js como aplicações separadas, e os arquivos não podem contornar as verificações de propriedade do Laravel através de uma URL pública previsível.

O desafio técnico também precisa de um desenho de storage que continue simples de rodar localmente e de publicar, sem introduzir infraestrutura de nuvem prematuramente.

## Decisão

O Laravel armazenará os anexos de Task em um disco de filesystem privado dedicado, com raiz abaixo de `storage/app/private/task-attachments`, fora do web root público.

O banco armazena os metadados do anexo e um caminho de storage gerado pelo servidor. O nome de arquivo original do cliente é mantido apenas como metadado de exibição/download e nunca determina o nome do arquivo armazenado.

Endpoints autenticados de controller do Laravel autorizam o acesso através de `Attachment -> Task -> Project -> User`. Imagens suportadas podem ser transmitidas inline; os demais documentos suportados são forçados a download. Nenhum endpoint redireciona para uma URL pública de filesystem nem expõe o caminho interno de storage.

A exclusão em nível de aplicação remove os arquivos físicos antes de apagar um registro de Attachment, Task ou Project. Isso é explícito porque cascatas de banco de dados não removem objetos do filesystem.

A implementação usa a facade `Storage` do Laravel, de modo que uma migração futura para um disco privado compatível com S3 possa preservar a fronteira da aplicação.

## Consequências

### Positivas

- a autorização de anexos permanece centralizada no Laravel;
- os arquivos não têm URL pública nem previsível;
- o ambiente local e o deploy do desafio permanecem simples;
- os caminhos gerados evitam confiar em nomes de arquivo do cliente;
- a abstração de filesystem deixa um caminho prático para object storage.

### Trade-offs

- o Laravel serve as respostas de anexo e, portanto, arca com a banda delas;
- o deploy em produção precisa persistir o diretório de storage privado;
- um deploy com múltiplas instâncias acabaria exigindo storage compartilhado ou de objetos.

## Gatilho de revisão

Revisitar quando o Taskly passar a rodar em múltiplas instâncias de aplicação, quando o tráfego de anexos afetar materialmente a capacidade do Laravel, ou quando o deploy oferecer um serviço privado de object storage.
