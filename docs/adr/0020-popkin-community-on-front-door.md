# 0020. popkin.community on Azure DNS and Azure Front Door

## Status

Accepted. Amends the addresses of [ADR 0017](0017-marketing-site.md) and
[ADR 0018](0018-deploy-to-azure-on-every-commit.md).

## Context

Every Popkin has its own address, `https://{address}.popkin.community` (L1-016, L2-064), so any
name under the domain must reach the app, over HTTPS, the moment a Popkin is started: there is no
time to add a domain per Popkin. That takes a wildcard name, `*.popkin.community`, and a wildcard
certificate. Neither Container Apps nor Static Web Apps issue a wildcard certificate; both would
need one bought or renewed by hand every few months.

The owner chose where each name leads:

- `app.popkin.community` — the Popkin web app (`frontend/projects/popkin`);
- `*.popkin.community` — the same web app, which tells an address from the app by its host;
- `popkin.community` and `www.popkin.community` — the marketing site
  (`frontend/projects/marketing`).

## Decision

- The domain stays registered at Namecheap. Its name servers are those of an Azure DNS zone,
  `popkin.community`, in `rg-popkin`, which holds every record of the domain.
- Azure Front Door Standard, `afd-popkin`, ends TLS for the four names with certificates it
  issues and renews itself, the wildcard among them (managed wildcard certificates are generally
  available since June 2025). It proves each name through a TXT record at `_dnsauth.<name>` in
  the zone; the apex and the wildcard share `_dnsauth.popkin.community`.
- One endpoint, two routes: `app` and `*` go to the Container App `popkin-web`; the apex and
  `www` go to the Static Web App `swa-popkin-marketing`. Neither route caches: the app's proxy
  sets its own `Cache-Control`, and a cached route refuses the hub's WebSocket upgrade. Both
  redirect HTTP to HTTPS.
- `www`, `app` and `*` are CNAME records to the endpoint; the apex is an alias A record to it. A
  name with a record of its own wins over the wildcard.
- `App:Origin` is `https://app.popkin.community` and invite links are
  `https://app.popkin.community/i/{code}`. The marketing site is built with that address as its
  `APP_URL`.
- `infra/domains.bicep` holds all of it and `infra/main.bicep` deploys it on every commit.

## Consequences

- No certificate is ever renewed by hand, and a new Popkin's address works at once.
- Front Door Standard costs about US$35 a month plus traffic; the zone about US$0.50.
- A WebSocket through Front Door closes after five idle minutes and lives two hours at most; the
  hub pings every 15 seconds and the client reconnects (ADR 0009).
- The Container App's own `*.azurecontainerapps.io` address still answers; nothing links to it.
- `about.popkin.community` (ADR 0017) and `admin.popkin.community` (ADR 0016) now fall under the
  wildcard and reach the app, which shows them as not found until a record of their own is added.
- The apex no longer serves the app's landing page, sign-up and Your Popkins, as
  [Open a Popkin by its address](../detailed-designs/popkins/open-by-address/README.md) assumed:
  in the app's terms, `app.popkin.community` is its apex. That design, and `readHost`, read
  `app` as the apex when they are built.
