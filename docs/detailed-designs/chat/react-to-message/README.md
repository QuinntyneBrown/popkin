# React to a message

## Overview

Members of a *Popkin* talk in chat threads: the shared *Everyone* thread and *direct messages*
between two members. This feature lets a member answer a message without writing one, by adding an
emoji *reaction*, and gathers the other actions on a single message in one place.

- **reaction** — one emoji that one member attached to one message; a member may add several different emoji to the same message
- **reaction chip** — pill under a message showing one emoji and how many members chose it
- **message actions** — dialog opened from a message, holding quick reactions, "More reactions", "Reply", "Copy" and, on the member's own message, "Delete"
- **quick reactions** — the short row of emoji offered first in message actions

A member opens message actions by pressing and holding a message on a touch screen, or by focusing
it and pressing Enter on a keyboard. Picking an emoji adds a reaction; choosing a chip the member
already added removes it. A chip shows the emoji and its count; the member's own reaction is marked
as pressed, outlined and tinted, so the state is not carried by colour alone. Reactions show at once
and are undone with a message if they fail to save. "Reply" belongs to reply-to-message; "Delete"
is specified here because it lives in this dialog.

## Description

**Screens and states:**

- `docs/mocks/dialogs/reactions/default.html` — "Message actions" on Walt's message, which the member reacted to with a heart: a quote of the message, an emoji grid labelled "Reactions" with five quick reactions ("React heart" pressed, "React laughing", "React heart eyes", "React fire", "React clapping"), then "More reactions", "Reply" and "Copy".
- `docs/mocks/dialogs/reactions/mine.html` — the same on the member's own message, with "Delete" (danger) after "Copy".
- `docs/mocks/dialogs/reactions/more.html` — "More reactions" open (`aria-expanded="true"`): a second grid labelled "More reactions" with twelve emoji, between "More reactions" and "Reply".
- `docs/mocks/dialogs/delete-message/default.html` — "Delete this message?", "It's removed for everyone in this chat.", "Delete" (danger) and "Keep", focus on "Keep".
- `docs/mocks/pages/group-chat/default.html` — reaction chips such as "Heart, you reacted, 3" (`aria-pressed="true"`) and "Pancakes, 6"; each message with actions is focusable (`role="article"`, `tabindex="0"`).
- `docs/mocks/pages/group-chat/read-only.html` and `direct-message/read-only.html` — the chips of a wrapped-up Popkin, which are not buttons: `span.reaction`, `reaction--mine` for the member's own, the name in visually hidden text.
- `docs/mocks/pages/direct-message/default.html` — the same chips in a direct message (L2-023 AC3). The group chat's mocks of the dialog stand for a direct message too.
- `docs/mocks/notifications/toast/success.html` stands for "Message copied." (title only, no action), and `toast/danger.html` for "We couldn't save your reaction." and "We couldn't delete your message.", each with "Try again".

**Parts the components reproduce:**

- Quick reactions — `div.emoji-grid` `role="group"` `aria-label="Reactions"` of five `button.emoji-btn`, named "React {name in lower case}" with `aria-pressed`; "More reactions" — `button.menu-list__item` with `aria-expanded` and `aria-controls="more-reactions"`, which shows `div.emoji-grid#more-reactions` `aria-label="More reactions"` of twelve `button.emoji-btn`. "Reply" and "Copy" are `button.menu-list__item`; "Delete" is `button.menu-list__item.menu-list__item--danger`.
- Chip — `button.reaction` with `aria-pressed` and `aria-label` "{Name}, {count}" or "{Name}, you reacted, {count}"; in a wrapped-up Popkin `span.reaction` (`reaction--mine` when the member's) with the same words in `.visually-hidden`.
- Delete dialog — `pk-dialog` titled "Delete this message?" with its description, `btn btn--danger` "Delete" and `btn btn--secondary` "Keep".

**API:**

- `PUT /api/popkins/{popkinId}/threads/{threadId}/messages/{messageId}/reactions/{emoji}` — 200 `ReactionDto[]`, the message's whole summary, idempotent; 400 `reaction_invalid`; 404 `popkin_not_found`, `thread_not_found` (a direct message of two other members too), `message_not_found` (a deleted message or a system note too); 409 `popkin_wrapped_up`. The emoji travels URL-encoded in the path.
- `DELETE …/messages/{messageId}/reactions/{emoji}` — 200 `ReactionDto[]`, idempotent; the same 404 and 409 codes.
- `DELETE /api/popkins/{popkinId}/threads/{threadId}/messages/{messageId}` — 204; 403 `not_message_author`; 404 `message_not_found`; 409 `popkin_wrapped_up`.
- `MessageDto.Reactions` — `ReactionDto[]`, grouped by emoji in order of first use. `ReactionDto(string Emoji, Guid[] MembershipIds)`: the client counts the members and finds its own; the members of a Popkin may see who reacted.
- Hub event `ReactionsChanged(Guid threadId, Guid messageId, ReactionDto[] reactions)` to the thread's audience: the Popkin's group for Everyone, the two members for a direct message. It carries no version (known gap 70); its recovery read is the loaded window, as in [Live messages](../live-messages/README.md#events-and-their-recovery-reads). `MessageDeleted(threadId, messageId)` as before.

**Frontend (Popkin web app):**

- **Opening** — `pk-message` is focusable and raises an `actions` output after a press and hold of 500 ms, or on Enter or Space (L2-024 AC1). A pending, waiting or failed message of the member's own, a system note and every message of a wrapped-up Popkin open nothing and are not focusable. The page opens `ReactionsDialog` with CDK `Dialog`: a sheet below 640 px, centred from 640 px, as the other dialogs. Focus moves into the dialog; Escape and "Close" close it and focus returns to the message (L2-057 AC2).
- **`ReactionsDialog`** — `dialogs/reactions/reactions.dialog.ts`, titled "Message actions", composed of `pk-dialog`, the quote of the message, `pk-emoji-picker` for the five quick reactions and, under "More reactions", for the twelve more, and `pk-menu-item`s. Data: `ReactionsDialogData { message: MessageView; mine: boolean }`. It closes with a result: `{ react: emoji }`, `'reply'`, `'copy'`, `'delete'` or nothing. Choosing any emoji closes it.
- **Reactions offered** — quick: ❤️ Heart, 😂 Laughing, 😍 Heart eyes, 🔥 Fire, 👏 Clapping. More: 👍 Thumbs up, 🙌 Raised hands, 🎉 Party popper, 🥳 Partying face, 😮 Surprised, 😢 Crying, 🙏 Praying hands, 💯 Hundred, 😎 Sunglasses, 🤔 Thinking, 🥞 Pancakes, ☕ Coffee.
- **`reaction-names.ts`** — `api` library: the fixed table of those 17 emoji and their names. A chip of an emoji outside it, which another client may send, is named by the emoji itself.
- **`pk-emoji-picker`** — existing design-system component; it takes its options, each an emoji, a name and whether it is pressed, and raises the chosen emoji.
- **Reaction chips** — `pk-message` renders `ReactionChipView { emoji, name, count, mine }` as buttons; `ThreadStore` derives them from `MessageView.reactions` (`{ emoji, membershipIds }[]`) and the viewer's membership. The accessible name reads "{Name}, {count}", with ", you reacted" after the name when `mine`: "Heart, you reacted, 3" (L2-024 AC5). Choosing a chip toggles that reaction. In a wrapped-up Popkin the chips show as they are and are not buttons (L2-045).
- **`ThreadStore.toggleReaction(messageId, emoji)`** — applies the change at once: adds the member's reaction (L2-024 AC2, AC4) or removes it and drops a chip that reaches zero (AC3). It then calls `ChatApi.react` or `ChatApi.unreact` and replaces the message's reactions with the server's summary. On failure it restores the previous reactions and shows the danger toast "We couldn't save your reaction." with "Try again", which stays until dismissed (L2-056 AC7). A `ReactionsChanged` for a message it holds replaces that message's reactions.
- **Copy** — writes the message's text with the Clipboard API and shows the success toast "Message copied.", which goes after 8 seconds (L2-056 AC7).
- **Delete** — "Delete" opens `DeleteMessageDialog` (`dialogs/delete-message/`): "Delete this message?", "It's removed for everyone in this chat.", "Delete" (danger) and "Keep". Delete closes it and calls `ThreadStore.deleteMessage(messageId)`, which calls `ChatApi.deleteMessage` and removes the message on 204; `MessageDeleted` removes it from every other open thread. A failure keeps the message and shows the danger toast "We couldn't delete your message." with "Try again".

**Backend:**

- **`AddReactionCommand`** / **`RemoveReactionCommand`** — `PopkinId`, `ThreadId`, `MessageId`, `Emoji`.
- **`ReactionValidator`** — the emoji is one extended grapheme cluster of at most 32 UTF-16 units made only of emoji code points, with ZWJ, VS16, skin tones and keycaps; anything else is 400 `reaction_invalid` (L2-052).
- **`AddReactionCommandHandler`** — membership through `IMembershipGuard`, `ChatThread.CanRead`, the message in that thread, neither deleted nor a system note, `PopkinSpace.EnsureActive()` (L2-045). It inserts `MessageReaction(MessageId, MembershipId, Emoji)` unless the row exists. **`RemoveReactionCommandHandler`** deletes the row if present. Both send `ReactionsChanged` with the new summary to the thread's `Audience` and return it.
- **`DeleteMessageCommand`** / **`DeleteMessageCommandHandler`** — only the author may delete (403 `not_message_author`); `Message.Delete` sets `DeletedAt` from `TimeProvider`, clears `Text` and removes the message's reactions. The handler sends `MessageDeleted(threadId, messageId)` to the thread's audience. A deleted message is no longer listed; a reply to it keeps its link and its quote reads "Message deleted" (reply-to-message, L2-025 AC4).
- **`MessageReactionConfiguration`** — key `(MessageId, MembershipId, Emoji)`; `IAppDbContext` gains `DbSet<MessageReaction>`.
- **Abuse limits** — [Abuse limits](../../security/abuse-limits/README.md) names no limit for reactions, so none applies.

### Open questions

Settled for journey 12:

- Five quick reactions, as L2-024 AC1 asks, over the six of the earlier mock; 🥞 moved under "More reactions".
- "More reactions" shows twelve more in the same dialog, in a `pk-emoji-picker` grid; the API accepts any single emoji.
- The names of the chips come from a fixed table of the 17 emoji in the `api` library; an emoji outside it is named by itself.
- A press and hold opens the actions after 500 ms; Enter and Space on a focused message too.
- "Delete" asks first (`delete-message`); "Message copied.", "We couldn't save your reaction." and "We couldn't delete your message." are the toasts.
- `ReactionDto` carries the `MembershipIds` of those who reacted, not a count and a `Mine` flag: one summary serves every viewer, in the answer and in `ReactionsChanged`.
- In a wrapped-up Popkin the chips are not buttons and the messages open no actions.

Still open:

- What happens to the photo of a deleted message sent in Everyone, which is also in the album: `<TO SUPPLY>`, with journey 13.
- What the quote of the dialog shows for a photo without text: `<TO SUPPLY>`, with journey 13.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-024` | `L1-007` | React to a message: Members react to messages with emoji. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-057` | `L1-014` | Accessible to WCAG 2.2 AA: Everyone can use every screen. |
| `L2-023` | `L1-007` | Direct messages: Two members of one Popkin talk privately. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |

From `L2-023` this feature realises AC3 for reactions, and from `L2-056` AC7 for its toasts.

## Diagrams

The diagrams below were not redrawn after the decisions of journey 12. They show `ReactionDto`
with `Count` and `Mine`, `ReactionView` and `addReaction`/`removeReaction`, where the design now
has `MembershipIds`, `ReactionChipView` and `react`/`unreact`, and they draw neither "More
reactions" nor the Delete message dialog (known gap 69).

### System context

A member reacts to, copies and deletes messages through Popkin; no external system takes part.

![C4 system context for reacting to a message](diagrams/c4-context.png)

### Containers

The web app adds and removes reactions and deletes messages through the Popkin API; the API stores
`MessageReaction` rows and pushes `ReactionsChanged` and `MessageDeleted` to the thread's audience.

![C4 container view for reacting to a message](diagrams/c4-container.png)

### Components

The thread pages open `ReactionsDialog`, which shows `pk-emoji-picker` for more reactions, and render
chips through `pk-message`. `ThreadStore` calls `MessagesController`, which dispatches the add,
remove and delete handlers; each publishes through `SignalRPopkinNotifier`.

![C4 component view for reacting to a message](diagrams/c4-component.png)

### Class structure

A `Message` owns its `MessageReaction` rows. The add and remove handlers handle their commands and
return `ReactionDto`; `DeleteMessageCommandHandler` calls `Message.Delete`. On the client,
`ReactionsDialog` takes `ReactionsDialogData` and acts through `ThreadStore`, which holds
`ReactionView` values.

![Class diagram for reacting to a message](diagrams/class-structure.png)

### Behaviour — open message actions

Press and hold, or Enter on a focused message, opens the dialog (L2-024 AC1); each choice closes it
and focus returns to the message.

![Sequence diagram for opening message actions](diagrams/sequence-open-message-actions.png)

### Behaviour — add or remove a reaction

The chip changes at once; the API stores or removes the reaction idempotently and pushes the new
summary. A failure restores the previous chips and explains itself in a toast.

![Sequence diagram for adding or removing a reaction](diagrams/sequence-toggle-reaction.png)

### Behaviour — delete own message

Only the author may delete. The message is soft-deleted, removed from every open thread, and replies
that quote it read "Message deleted".

![Sequence diagram for deleting own message](diagrams/sequence-delete-message.png)
