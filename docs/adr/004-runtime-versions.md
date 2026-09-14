# ADR-004 — Pin the initial runtime version baseline

## Status

Accepted.

## Date

2026-09-14

## Context

Taskly should use current supported stable runtimes without relying on beta/current-only releases during a short technical challenge.

The selected baseline was checked against official framework/runtime release documentation immediately before bootstrap.

## Decision

Initial runtime baseline:

- PHP `8.5.x`
- Laravel `13.x`
- Node.js `24.x` LTS
- Next.js `16.3.3` or newer compatible `16.3.x` security patch
- PostgreSQL `18.6` / PostgreSQL `18.x` supported patch line

Lockfiles and container definitions will capture the actual resolved versions used by the project.

## Rationale

### Laravel 13

Laravel 13 is the current stable major framework release and supports PHP 8.3 through 8.5. Using it demonstrates current Laravel practices without choosing a preview release.

### PHP 8.5

PHP 8.5 is supported by Laravel 13 and matches the current Laravel installation guidance. The project will run PHP inside containers, reducing dependence on the VPS host PHP version.

### Next.js 16.3.x

Next.js 16.3 is the active supported line selected for the frontend. The baseline must include the current security patch rather than an older vulnerable patch level.

### Node.js 24 LTS

Node.js 24 is an LTS release. Node.js 26 is current rather than LTS at the time of this decision, so Node 24 is preferred for a production-minded technical challenge.

### PostgreSQL 18

PostgreSQL 18 is the current stable major line. Patch releases should remain current, especially when upstream releases include security fixes.

## Consequences

### Positive

- current supported framework/runtime capabilities;
- avoids intentionally starting on end-of-life versions;
- Docker makes the baseline reproducible independently of the VPS host packages;
- patch-level security updates can be applied without changing the architectural decision.

### Trade-offs

- Laravel 13 may differ from older Laravel versions the candidate has previously used and therefore requires version-aware review rather than relying on memory;
- Next.js 16 behavior must be checked against version-matched documentation;
- using current majors may expose ecosystem packages that have not kept pace, so dependencies should remain minimal.

## Guardrails

- Do not add packages merely because they are familiar from older Laravel/Next.js projects.
- Verify package compatibility with the pinned major versions before installation.
- Prefer framework-native functionality where it meets the requirement.
- Apply security patch updates within the selected major/minor line when available.
- AI-generated code must be reviewed against the actual installed versions, not generic or stale framework knowledge.

## Review trigger

Revisit only if a required dependency is incompatible, a security advisory requires a major/minor change, or the deployment platform imposes a concrete runtime constraint.
