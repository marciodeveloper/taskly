# Taskly Web

Frontend do Taskly, responsável pela experiência de produto, navegação entre projetos, formulários, visualizações de tarefas em lista e Kanban, drag-and-drop, estados otimistas e feedback ao usuário.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- `@dnd-kit/core`
- `lucide-react`

## Responsabilidades principais

- autenticação e recuperação de senha consumindo a API Laravel;
- shell autenticado e navegação entre projetos;
- criação e edição de projetos e tarefas;
- visualizações em lista e Kanban;
- drag-and-drop com atualização otimista e rollback em caso de falha;
- formulários, validação de experiência e mensagens de erro;
- interface responsiva e localizada em pt-BR;
- cliente HTTP tipado para os contratos REST do backend.

O frontend não acessa PostgreSQL diretamente e não é autoridade sobre regras de negócio. Autorização, validação e persistência permanecem no Laravel.

## Estrutura relevante

```text
apps/web/
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
│       ├── api/
│       ├── auth/
│       └── tasks/
└── public/
```

## Desenvolvimento local

O caminho recomendado é subir o monorepo pela raiz com Docker Compose. Para executar apenas o frontend no host:

```bash
cd apps/web
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Por padrão, o frontend usa a API em:

```text
http://127.0.0.1:18000
```

Se quiser deixar a configuração explícita:

```bash
cp .env.example .env.local
```

## Verificações

```bash
npm run lint
npm run build
```

Essas verificações também são executadas pela pipeline de CI antes de qualquer deploy da `main`.

## Produção

Em produção, o Next.js roda em container próprio atrás do Nginx no mesmo origin público do Laravel:

```text
https://taskly.webarthem.com.br
```

A pipeline constrói a imagem de produção, publica exatamente o SHA aprovado pelo CI e executa smoke tests públicos após o deploy.

A documentação principal do projeto está no [`README.md`](../../README.md), com detalhes adicionais em [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) e [`docs/AI_USAGE.md`](../../docs/AI_USAGE.md).
