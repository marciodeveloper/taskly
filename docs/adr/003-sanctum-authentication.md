# ADR-003 — Use Laravel Sanctum for first-party authentication

## Status

Accepted, with deployment details to be finalized during environment bootstrap.

## Context

Taskly requires:

- own e-mail/password registration;
- login;
- persistent authenticated sessions;
- logout;
- a Next.js first-party frontend;
- a Laravel backend API.

There is no requirement for third-party OAuth or for issuing portable access tokens to external clients.

## Decision

Use Laravel Sanctum with stateful browser authentication based on Laravel sessions and secure HTTP-only cookies.

The frontend will authenticate against Laravel as a first-party client.

Expected flow:

1. frontend initializes CSRF protection;
2. registration/login request is sent to Laravel;
3. Laravel creates the authenticated session;
4. browser stores the session cookie according to secure cookie policy;
5. subsequent API calls rely on the authenticated session;
6. logout invalidates the server-side session.

## Security properties

- Password hashing uses Laravel framework defaults.
- Authentication state is not stored as a custom JWT in browser local storage.
- CSRF protection remains enabled.
- Cookies use secure settings in production.
- Authorization is still evaluated independently for each protected resource.
- Authentication alone never implies ownership of a project/task.

## Local/deployment topology

Exact values will be finalized when the runtime is bootstrapped, including:

- frontend origin;
- API origin;
- `SANCTUM_STATEFUL_DOMAINS`;
- `SESSION_DOMAIN`;
- CORS allowed origins;
- HTTPS/secure-cookie behavior;
- local development ports.

The preferred deployment is to keep frontend and API under the same registrable parent domain when practical, for example:

```text
app.example.com
api.example.com
```

or to reverse-proxy them under a topology that preserves straightforward first-party session behavior.

## Consequences

### Positive

- native Laravel authentication model;
- secure HTTP-only session cookie;
- CSRF protection is explicit;
- no custom token refresh/revocation protocol;
- reduced exposure compared with storing bearer JWTs in browser-accessible storage;
- well suited to a first-party browser application.

### Trade-offs

- CORS, cookie domains, same-site policy, and stateful domains must be configured carefully;
- local development uses separate frontend/backend origins and requires deliberate environment configuration;
- future third-party/mobile API clients may need a different token strategy.

## Alternatives considered

### Custom JWT authentication

Rejected for the current product. It adds token issuance, storage, rotation/revocation, refresh behavior, and security decisions without a requirement that justifies the additional complexity.

### NextAuth/Auth.js as the primary authentication authority

Rejected because Laravel is the authoritative backend/domain layer and should own user authentication for this architecture.

### OAuth-only authentication

Rejected because the technical challenge explicitly requires own e-mail/password authentication and does not require Google or Microsoft integration.

## Testing expectations

Automated coverage should verify at minimum:

- successful registration;
- duplicate e-mail validation;
- valid login;
- invalid credentials;
- authenticated session access;
- unauthenticated rejection;
- logout/session invalidation;
- cross-user authorization remains blocked after authentication.

## Review trigger

Revisit only if deployment infrastructure prevents reliable first-party cookie authentication or if future product requirements add external/mobile clients that materially benefit from token-based API authentication.
