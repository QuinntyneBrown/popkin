# 0030. Notification emails are Razor components rendered with HtmlRenderer

## Status

Accepted, 17 November 2026. Settles gap 128 of the register of known gaps, which
[Popkin update email](../detailed-designs/notifications/popkin-update-email/README.md),
[Digest emails](../detailed-designs/notifications/digest-emails/README.md) and
[Send reminders](../detailed-designs/notifications/send-reminders/README.md) left as `<TO SUPPLY>`.
The owner chose Razor components on 17 November 2026.

## Context

L2-163 asks for HTML emails with a plain-text part, drawn by the email mocks in
`docs/mocks/notifications/email-*`, that carry text members wrote (a message, a caption, a name).
Every such piece of text must be encoded, so a member cannot put markup into another member's
inbox. Today the only emails, the sign-in codes and invites, are plain-text strings in
`CommunicationText` (`Popkin.Infrastructure/Auth/CommunicationSenders.cs`); that does not scale to
seven email layouts sharing one shell.

The options weighed:

- **Razor components rendered with `HtmlRenderer`** (`Microsoft.AspNetCore.Components.Web`, part of
  the shared framework since .NET 8): typed models as component parameters, HTML-encoded by default,
  a shared shell as a layout component, and no web server or HTTP context needed, so the Worker can
  render. First-party and maintained with .NET.
- **A string template engine** (Scriban, Fluid/Liquid, Handlebars.Net): a third-party dependency,
  untyped models, and encoding that each template must remember.
- **Hand-built strings or `XElement`**: typed, but the email layouts would be code, not markup, and
  far from the mocks they must match.

## Decision

- **Each email is a Razor component** in `Popkin.Infrastructure/Notifications/Emails/`, taking its
  typed model (`PopkinUpdateEmailModel`, `DigestEmailModel`, the reminder models) as a parameter and
  laid out inside one `EmailShell` component that holds the header, the reason line and the footer
  of L2-163.
- **`NotificationEmailRenderer`** implements `INotificationEmailRenderer` with `HtmlRenderer`,
  creating it from the service provider in the Worker. It renders the HTML part from the component
  and the plain-text part from a second, text-only rendering of the same model, so the two never
  disagree.
- **No raw markup from data.** Templates never use `MarkupString` on a model value; every member's
  text goes through Razor's encoding. A test proves a message holding `<script>` arrives encoded in
  the HTML and verbatim in the text part.
- **Email-safe markup.** Templates use tables for layout and inline styles taken from the mocks'
  tokens, because email clients ignore `<style>` blocks unevenly; the BEM classes of the mocks stay
  on the elements so a reader of the template can match it to its mock. Images are inline `cid:`
  attachments under 1 MB in all, as the design says.

## Consequences

- `Popkin.Infrastructure` takes a framework reference to `Microsoft.AspNetCore.App` (it already runs
  inside the API and the Worker, both on the ASP.NET Core shared framework).
- Email templates are tested by rendering a model and asserting on the HTML and text, not by
  comparing screenshots; no visual sweep covers them.
- A later need for marketing-edited templates would need a different engine and its own ADR.
