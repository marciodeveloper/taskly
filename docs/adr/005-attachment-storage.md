# ADR-005 — Store task attachments in private Laravel storage

## Status

Accepted.

## Date

2026-09-15

## Context

Task attachments contain user-owned private data. Taskly runs Laravel and Next.js as separate applications, and files must not bypass Laravel's ownership checks through a predictable public URL.

The technical challenge also needs a storage design that remains straightforward to run locally and deploy without introducing cloud infrastructure prematurely.

## Decision

Laravel will store Task attachments on a dedicated private filesystem disk rooted below `storage/app/private/task-attachments`, outside the public web root.

The database stores attachment metadata and a server-generated storage path. The original client filename is retained only as display/download metadata and never determines the stored filename.

Authenticated Laravel controller endpoints authorize access through `Attachment -> Task -> Project -> User`. Supported images may be streamed inline; other supported documents are forced to download. No endpoint redirects to a public filesystem URL or exposes the internal storage path.

Application-level deletion removes physical files before deleting an Attachment, Task, or Project record. This is explicit because database cascades cannot remove filesystem objects.

The implementation uses Laravel's `Storage` facade so a future move to an S3-compatible private disk can preserve the application boundary.

## Consequences

### Positive

- attachment authorization remains centralized in Laravel;
- files have no public or predictable URL;
- local and challenge deployment remain simple;
- generated paths avoid trusting client filenames;
- the filesystem abstraction leaves a practical path to object storage.

### Trade-offs

- Laravel serves attachment responses and therefore handles their bandwidth;
- production deployment must persist the private storage directory;
- a multi-instance deployment would eventually require shared or object storage.

## Review trigger

Revisit when Taskly moves to multiple application instances, attachment traffic materially affects Laravel capacity, or deployment provides a private object-storage service.
