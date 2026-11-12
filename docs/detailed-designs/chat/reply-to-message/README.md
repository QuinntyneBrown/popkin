# Reply to a message

## Overview

Members of a *Popkin* talk in the shared *Everyone* thread and in *direct messages*. In a busy thread
a short answer such as "Put me down" is ambiguous unless it says what it answers. A *reply* solves
this: it is a message that carries a quote of the message it answers.

- **reply** — message whose `ReplyToMessageId` names an earlier message of the same thread
- **quote** — the first name of the quoted message's author and one line of its text, shown inside the reply's bubble
- **reply bar** — strip above the message field reading "Replying to {first name}" with one line of the message and "Cancel reply"

A member chooses "Reply" in the message actions dialog (react-to-message). The composer shows the
reply bar and puts focus in the message field. The sent reply carries its quote. Choosing a quote
scrolls the thread to the quoted message and marks it briefly. When the quoted message has been
deleted, the quote reads "Message deleted".

## Description

**Screens and states:**

- `docs/mocks/pages/group-chat/default.html` — reply bar "Replying to Ruth" with "Cancel reply"; a sent reply quoting Ellie ("Can someone grab the paddles from the shed?").
- `docs/mocks/dialogs/reactions/default.html` — the "Reply" action.
- No mock draws the brief mark on a quoted message after a jump, nor a "Message deleted" quote; both are `<TO SUPPLY>` mock states.

**API:**

- `POST /api/popkins/{popkinId}/threads/{threadId}/messages` with `replyToMessageId` — 201 or 200 `MessageDto` with `Quote`; 400 `reply_not_found`; the other codes as in send-message-to-everyone.
- `GET /api/popkins/{popkinId}/threads/{threadId}/messages?around={messageId}&limit=50` — 200 `MessagePageDto` centred on a message; 404 `message_not_found` when the message is not in the thread.

**Frontend (Popkin web app):**

- **`GroupChatPage`** and **`DirectMessagePage`** — hold `replyTo: Signal<MessageView | null>`. `startReply` sets it when `ReactionsDialog` closes with `'reply'`; `cancelReply` clears it and keeps focus in the field. Sending clears it.
- **`pk-composer`** — renders its `composer__reply` part when given a quote: a bold "Replying to {first name}", one truncated line of the message (or "Photo" for a photo without text, copy `<TO SUPPLY>`), and the icon button "Cancel reply" (L2-025 AC1). The composer moves focus to the field when the bar appears.
- **`pk-message`** — renders `QuoteView { messageId, authorFirstName, snippet, deleted }` as its `bubble__quote` part (L2-025 AC2). A live quote is a button whose accessible name reads "Go to {first name}'s message" (copy `<TO SUPPLY>`); a deleted quote reads "Message deleted" and is not interactive (AC4).
- **Jump** — the page scrolls the quoted message to the centre of the thread and focuses it. `ThreadStore.highlighted` marks it for a short time (duration `<TO SUPPLY>`) with an outline as well as a tint (L2-025 AC3, L2-057 AC5). Under `prefers-reduced-motion` the scroll is instant (L2-060 AC1).
- **`ThreadStore.loadUntil(messageId)`** — when the quoted message is older than the loaded pages, the store fetches a page around it and keeps the window between that page and the loaded ones as a gap that fills as the member scrolls. The gap's presentation is `<TO SUPPLY>`.
- **Pending replies** — `MessageOutbox` keeps `replyToMessageId` on the entry, so a pending, waiting or failed reply shows its quote, and a retry sends it again (failed-messages).

**Backend:**

- **`SendMessageCommand.ReplyToMessageId`** — optional. `SendMessageCommandHandler` loads the target; a target that does not exist or belongs to another thread is 400 `reply_not_found`. A deleted target is allowed and still links. `Message.ReplyTo(target)` sets the link.
- **`QuoteDto`** — `MessageId`, `AuthorFirstName`, `Snippet` (the first line of the text, at most 120 characters, `<TO SUPPLY>` length), `HasPhoto`, `Deleted`. `GetMessagesQueryHandler` projects it with a left join on `ReplyToMessageId`; a deleted target yields `Deleted = true` with no name or snippet (L2-025 AC4).
- **`GetMessagesQuery.Around`** — returns 25 messages before and 25 after the target, inclusive, in the same order and shape as other pages.
- **`MessageConfiguration`** — `ReplyToMessageId` is a self-reference with `DeleteBehavior.NoAction`; messages are soft-deleted (react-to-message), so the link never dangles.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-025` | `L1-007` | Reply to a message: A reply quotes the message it answers. |
| `L2-060` | `L1-014` | Motion is optional: Motion explains; it never gets in the way. |

## Diagrams

### System context

A member replies to a message with a quote through Popkin; no external system takes part.

![C4 system context for replying to a message](diagrams/c4-context.png)

### Containers

The web app posts replies and loads pages around a quoted message through the Popkin API, which
stores the link in `Message.ReplyToMessageId`.

![C4 container view for replying to a message](diagrams/c4-container.png)

### Components

`ReactionsDialog` hands "Reply" back to the page, which binds the reply to `pk-composer` and renders
quotes in `pk-message`. `ThreadStore` sends through `MessagesController`; the send handler checks the
replied-to message and the query handler projects quotes.

![C4 component view for replying to a message](diagrams/c4-component.png)

### Class structure

A `Message` may reply to one earlier `Message`. `MessageDto` carries an optional `QuoteDto`; the
page holds `replyTo` and renders `QuoteView`, and `ThreadStore` loads the pages a jump needs.

![Class diagram for replying to a message](diagrams/class-structure.png)

### Behaviour — reply to a message

"Reply" shows the reply bar with focus in the field (L2-025 AC1); the sent reply carries its quote
(AC2). A replied-to message outside the thread is refused with `reply_not_found`.

![Sequence diagram for replying to a message](diagrams/sequence-reply.png)

### Behaviour — jump to a quoted message

Choosing a quote scrolls to the quoted message and marks it briefly (L2-025 AC3), loading a page
around it first when it is older than the loaded pages; a deleted quote has nowhere to go (AC4).

![Sequence diagram for jumping to a quoted message](diagrams/sequence-jump-to-quote.png)
