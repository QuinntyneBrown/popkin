# 0028. Phone reminders are sent by Web Push

## Status

Accepted, 17 November 2026. Settles the phone notification channel that
[Reminders](../detailed-designs/contacts/reminders/README.md) and the register of known gaps
(gaps 104 and 114) left as `<TO SUPPLY>`. The owner chose Web Push on 16 November 2026.

## Context

L2-140 AC2 asks for a phone notification at 9 am on a reminder day when "Phone notifications" is
on. Popkin is a web app (ADR 0002): it has no native app to receive a push. Two channels could
reach a phone:

- **Web Push** (the Push API, RFC 8030, with VAPID, RFC 8292): the browser holds a subscription
  per device, a service worker shows the notification, and the server signs each push with a key
  pair it holds. It is free, needs no phone number, and works in Chrome, Edge and Firefox on
  Android and desktop, and in Safari on iOS 16.4 and later once Popkin is added to the Home
  Screen.
- **A text message** by Azure Communication Services, which already sends sign-in codes
  (ADR 0021): it reaches any phone but costs per message, needs a number the person may not have
  given (an account can sign in by email), and puts a contact's name in an SMS the carrier can
  read.

## Decision

- **Web Push carries phone reminders.** A device subscribes when the person turns "Phone
  notifications" on there.
  The subscription (its endpoint and keys) is saved as a `PushSubscription` of the person, one per
  endpoint; turning the switch off on a device removes that device's subscription.
- **The Worker signs with VAPID.** `WebPushPhoneNotificationSender` implements
  `IPhoneNotificationSender` with the `WebPush` library. The public key is configuration
  (`Push:PublicKey`) that the web app reads from `GET /api/contacts/push-key`; the private key is a
  secret (`Push:PrivateKey`), passed to Bicep as a `@secure()` parameter from the GitHub secret
  `PUSH_PRIVATE_KEY`, as `Auth:CodeHashKey` is. `Push:Subject` is the `mailto:` of the sender.
- **Without a key nothing is sent.** With no private key the sender sends nothing and the job
  marks the reminder notified, so a deploy before the secret is set breaks nothing; the in-app
  reminder and the email still go.
- **A gone subscription is removed.** A push answered `404` or `410` deletes that subscription.
- **The notification says little.** Its title is the reminder's words ("Grace turns 33 on
  Saturday"), it opens the contact's profile, and it carries no note, phone or email (L2-122).
- **A service worker shows it.** `frontend/projects/popkin/public/push-worker.js` handles `push`
  and `notificationclick` only; it caches nothing.

## Consequences

- The person must allow notifications in the browser; if they refuse, the switch stays on for
  their other devices, and this device shows "Notifications are blocked in this browser".
- On iOS a notification reaches only a Popkin added to the Home Screen.
- A new secret, `PUSH_PRIVATE_KEY`, must be set in GitHub once; `docs/deployment.md` lists it.
- The Worker gains an outbound HTTPS call per notification to the browser's push service.
