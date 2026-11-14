# 0018. Every commit to main is deployed to Azure

## Status

Accepted, 14 November 2026. Supplies what [ADR 0013](0013-deployment-shape.md) left
`<TO SUPPLY>`: where the images are pushed, what runs them, and the reverse proxy.

## Context

ADR 0013 fixed the shape of a deployment: two images, one reverse proxy, one origin, a migration
before the new API starts. Nothing built or ran them. The owner asked that every commit to `main`
be deployed to Azure, and that the app (`frontend/projects/popkin`) and the marketing site
(`frontend/projects/marketing`, [ADR 0017](0017-marketing-site.md)) be published separately, each
open to the public. The constraints of ADR 0013 still hold: the web app, `/api` and `/hubs` share
one origin (the `__Host-` cookie and the `'self'` policy), and the API runs as one instance
([ADR 0009](0009-one-api-instance.md)).

## Decision

- **CI deploys.** The `Deploy` workflow (`.github/workflows/deploy.yml`) runs from CI on every
  push to `main` once the backend, frontend and Playwright jobs pass, and by hand
  (`workflow_dispatch`). Deployments run one at a time and a run on `main` is never cancelled.
  Pull requests build the three images and push none.
- **GitHub signs in to Azure with OpenID Connect**, as the Entra application
  `popkin-github-deploy`, trusted for the repository's `production` environment alone, which
  deploys from `main` alone. No Azure credential is stored in GitHub. Its roles on the resource
  group are Contributor and Role Based Access Control Administrator, limited by a condition to
  assigning AcrPull (and, since ADR 0021 and ADR 0022, Communication and Email Service Owner
  and Storage Blob Data Contributor).
  `eng/Initialize-Azure.ps1` sets all of this up once.
- **The infrastructure is code**: `infra/registry.bicep` (the registry, deployed first so the
  images can be pushed) and `infra/main.bicep` (everything else), deployed whole on each run, in
  the resource group `rg-popkin`.
- **Azure Container Apps runs the images**, tagged with the commit, from Azure Container
  Registry, pulled with a managed identity:
  - `popkin-web`: the reverse proxy, **Caddy**, in a third image (`infra/web/`) that builds the
    app and serves it with `index.html` as the fallback and the header set of
    [Personal data protection](../detailed-designs/security/personal-data-protection/README.md),
    and forwards `/api` and `/hubs` (WebSockets included) to the API. Public; the Container Apps
    ingress ends TLS and sends HTTP to HTTPS.
  - `popkin-api`: one replica, minimum and maximum (ADR 0009), reachable inside the environment
    only. Its init container runs `popkin migrate` from the same image before the new revision
    starts, which is the release step of ADR 0013.
  - `popkin-worker`: one replica, no ingress, rolled out after the API.
- **Azure SQL Database**, with Microsoft Entra authentication alone: the apps' user-assigned
  identity is the server's administrator and signs in with no password. It is in Central US,
  since East US 2, where the rest runs, takes no new SQL servers.
- **The marketing site is an Azure Static Web App of its own**, on its own public address. The
  release builds it with the deployed app's address as `APP_URL` (`--define POPKIN_APP_URL`).
- `Auth:CodeHashKey` and `Photos:SigningKey` are generated once into the `production`
  environment's secrets and handed to the API and the Worker as Container Apps secrets.
- After each release the workflow runs the first three steps of the smoke test of
  [`docs/deployment.md`](../deployment.md) against the public addresses.

## Consequences

- A commit that breaks a test is not deployed; one that passes is live minutes later, with no
  approval step. Rolling back is a revert on `main`, or reactivating an earlier revision.
- The app and the marketing site have Azure's generated addresses until custom domains
  (`popkin.community`, `about.popkin.community`) are bound; that is `<TO SUPPLY>`.
- The apps' identity administers the SQL server, so the API can change the schema it also uses.
  A narrower database user for the API and the Worker, with the migration alone as owner, would
  need a script run inside the database; it is left until a second person deploys.
- The deployed system has what `docs/deployment.md` lists as not chosen: no SMS or email
  provider (a code request answers 503 `code_not_sent`), no photo store, no media relay, no
  `Proxy:KnownProxies` (every person shares the proxy's address in the rate limits) and no
  `DataProtection:KeysPath` (a new revision signs everyone out). Each is supplied by setting it
  in `infra/main.bicep`.
- The API, the Worker and the proxy run all the time, and the registry and database are paid by
  the month: roughly USD 30 to 50 a month at Popkin's current load.
