# 0013. Deployment: two container images behind one reverse proxy

## Status

Accepted, 13 November 2026.

## Context

Nothing said how Popkin is deployed. The README named two settings a deployed API needs and
missed a third (`App:Origin`); the designs left "whether the web app is served by the Popkin API
or a separate static host" and "whether TLS ends at a reverse proxy" as `<TO SUPPLY>`. Three
facts constrain the answer:

- The session cookie is `__Host-popkin`, `SameSite=Strict`, and the content security policy is
  `'self'`: the web app, `/api` and `/hubs` must be **one origin**.
- The API never migrates the database on startup (`AGENTS.md`).
- The API runs as one instance (ADR 0009).

## Decision

- **Two images, built from this repository**: `popkin-api` (`backend/src/Popkin.Api/Dockerfile`)
  and `popkin-worker` (`backend/src/Popkin.Worker/Dockerfile`). Each is a multi-stage build, SDK
  image to build and runtime image to run, on the .NET version of `backend/global.json`, running
  as the image's non-root user, with the `popkin` tool published beside the service.
- **One reverse proxy in front, one origin.** The proxy ends TLS, serves the built web app
  (`frontend/dist/popkin/browser`, with `index.html` as the fallback for app routes) and forwards
  `/api` and `/hubs` to the API with WebSockets allowed. The API serves no static file. The proxy
  product is `<TO SUPPLY>`; its requirements are in [`docs/deployment.md`](../deployment.md).
- **The API trusts forwarded headers from the configured proxy only** (`Proxy:KnownProxies`,
  `Proxy:KnownNetworks`). With neither set it ignores `X-Forwarded-For` and `X-Forwarded-Proto`.
- **Migration is a release step.** `popkin migrate` runs from the API image before the new API
  starts.
- **The platform probes two endpoints**: `GET /api/health` (the process answers) and
  `GET /api/health/ready` (the database can be reached). Both are anonymous and say nothing but a
  status.
- **CI builds both images on every pull request** and pushes neither. An image nobody builds is
  broken by the first change to a project reference, and nothing says so.
- [`docs/deployment.md`](../deployment.md) lists every setting a deployed system needs and what
  happens without it. A setting added to the code is added there in the same change.

## Consequences

- The web app's files are built by the release, not by an image of this repository; a third
  image for them would fix the proxy product, which is not chosen.
- The proxy must copy the security headers of
  [Personal data protection](../detailed-designs/security/personal-data-protection/README.md)
  onto the web app's files.
- Where the images are pushed, what runs them and how a release is rolled back are `<TO SUPPLY>`.
- One API instance means a deployment drops open hub connections for the length of a restart.
