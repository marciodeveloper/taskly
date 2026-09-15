# ADR-004 — Fixar a linha de base inicial de versões de runtime

## Status

Aceito.

## Data

2026-09-14

## Contexto

O Taskly deve usar runtimes estáveis e atualmente suportados, sem depender de releases beta ou "current-only" durante um desafio técnico curto.

A linha de base escolhida foi conferida na documentação oficial de release dos frameworks/runtimes imediatamente antes do bootstrap.

## Decisão

Linha de base inicial de runtime:

- PHP `8.5.x`
- Laravel `13.x`
- Node.js `24.x` LTS
- Next.js `16.3.3` ou patch de segurança `16.3.x` compatível mais recente
- PostgreSQL `18.6` / linha de patch suportada do PostgreSQL `18.x`

Os lockfiles e as definições de container registram as versões efetivamente resolvidas pelo projeto.

## Justificativa

### Laravel 13

O Laravel 13 é o release major estável atual e suporta PHP 8.3 a 8.5. Usá-lo demonstra práticas atuais de Laravel sem escolher um release de preview.

### PHP 8.5

O PHP 8.5 é suportado pelo Laravel 13 e corresponde à orientação atual de instalação do Laravel. O projeto executa o PHP dentro de containers, o que reduz a dependência da versão de PHP do host da VPS.

### Next.js 16.3.x

O Next.js 16.3 é a linha suportada ativa escolhida para o frontend. A linha de base deve incluir o patch de segurança atual, e não um nível de patch antigo e vulnerável.

### Node.js 24 LTS

O Node.js 24 é um release LTS. O Node.js 26 é "current" e não LTS no momento desta decisão, então o Node 24 é preferível para um desafio técnico com mentalidade de produção.

### PostgreSQL 18

O PostgreSQL 18 é a linha major estável atual. Os releases de patch devem permanecer atualizados, especialmente quando o upstream inclui correções de segurança.

## Consequências

### Positivas

- capacidades atuais e suportadas de framework/runtime;
- evita começar deliberadamente em versões em fim de vida;
- o Docker torna a linha de base reproduzível independentemente dos pacotes do host da VPS;
- atualizações de segurança em nível de patch podem ser aplicadas sem alterar a decisão arquitetural.

### Trade-offs

- o Laravel 13 pode diferir de versões mais antigas do Laravel já usadas pelo candidato e, portanto, exige revisão consciente da versão em vez de confiança na memória;
- o comportamento do Next.js 16 precisa ser conferido contra a documentação da versão correspondente;
- usar majors atuais pode expor pacotes do ecossistema que não acompanharam o ritmo, então as dependências devem permanecer mínimas.

## Guardrails

- Não adicionar pacotes só por serem familiares de projetos Laravel/Next.js mais antigos.
- Verificar a compatibilidade do pacote com as versões major fixadas antes de instalar.
- Preferir funcionalidade nativa do framework quando ela atender ao requisito.
- Aplicar atualizações de patch de segurança dentro da linha major/minor escolhida quando disponíveis.
- Código gerado por IA deve ser revisado contra as versões efetivamente instaladas, não contra conhecimento genérico ou desatualizado do framework.

## Gatilho de revisão

Revisitar apenas se uma dependência necessária for incompatível, se um aviso de segurança exigir mudança de major/minor, ou se a plataforma de deploy impuser uma restrição concreta de runtime.
