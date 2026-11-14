# 0021. Codes and crew invites are sent by Azure Communication Services

## Status

Accepted, 14 November 2026. Settles the SMS and email providers that the sign-up design, the
recap design and [`docs/deployment.md`](../deployment.md) left as `<TO SUPPLY>`.

## Context

A person signs up and signs in with a code sent to their phone or their email (L2-003, L2-005,
L2-006), and "Pop up another with this crew" sends the new Popkin's invite the same way (L2-046
AC5). No provider was chosen, so outside Development every code request answered 503
`code_not_sent` and nobody could sign up on the deployed app.

Popkin runs on Azure ([ADR 0018](0018-deploy-to-azure-on-every-commit.md)), its apps sign in with
one user-assigned managed identity, and `popkin.community` is an Azure DNS zone
([ADR 0020](0020-popkin-community-on-front-door.md)).

## Decision

- **Azure Communication Services sends both channels.** `acs-popkin` sends SMS; its Email
  Communication Service `acs-popkin-email` sends email. The API signs in with the apps' managed
  identity, which holds the built-in role Communication and Email Service Owner on the two; no
  connection string or access key exists.
- **Email comes from `DoNotReply@popkin.community`.** Bicep declares the domain and writes the
  records it is checked by (domain, SPF, DKIM, DKIM2) into the zone. Until the domain is checked,
  mail comes from the Azure-managed domain that is declared beside it, which works the moment it
  exists but sends few messages an hour. Checking is started once, by hand, as
  [`docs/deployment.md`](../deployment.md) says; then `customEmailDomainVerified` is set and the
  sender moves to `popkin.community`.
- **SMS comes from a toll-free number.** A number is bought in the portal, not in Bicep, and a
  toll-free number sends in the United States and Canada only once its verification is approved.
  Until `smsSender` names the number, a phone code still answers 503 `code_not_sent`.
- **A channel without its setting stays unconfigured.** `Communication:Endpoint` with
  `Communication:EmailSender` turns on email; with `Communication:SmsSender`, SMS. In Development
  the codes are still written to the log unless those settings are given.
- **The words.** A code: "{code} is your Popkin code. It works for 10 minutes. If you didn't ask
  for it, you can ignore this." (the email's subject, "{code} is your Popkin code"). A crew
  invite: "{Host} started {Popkin} on Popkin. Join the crew: {link}" (the email's subject,
  "{Host} started {Popkin} on Popkin"). Nothing given to a sender is logged (L2-054 AC3).

## Consequences

- Sign up and sign in by email work on the deployed app once this is deployed; by phone once the
  toll-free number is approved and named.
- Messages cost money per message, and the managed identity can now send in Popkin's name.
- Delivery is not awaited: a code counts as sent when the service accepts it. A message the
  service accepts and later fails to deliver is not reported to the person; "Send a new code"
  (L2-005) is their way back.
- Known gaps 1 and 51 (no SMS or email provider) are closed in the design; the photo store
  remains open.
