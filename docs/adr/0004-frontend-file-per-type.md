# 0004. Frontend: one file per type, no single-file components

## Status

Accepted, 12 November 2026.

## Context

Inline templates are not formatted or linted as HTML, do not get editor support for markup, and
make a component's structure harder to compare with its mock.

## Decision

- Every Angular component is a file per type, beside its class and named after it: `name.ts`
  holds the class and its metadata, `name.html` holds the template, and `name.scss` holds the
  styles of a library component (ADR 0007). A page or dialog in an application project has no
  stylesheet.
- A component sets `templateUrl` (and `styleUrl` when it has styles). It never sets
  `template` or `styles`, however short the markup is. A one-line template still gets its own
  `.html` file.

## Consequences

- A new component adds at least two files; a review rejects an inline `template` or `styles`.
- Prettier and angular-eslint see all markup, so CI checks it.
