# Journey prompts

One ready-to-run implementation prompt per journey in [`docs/journeys.md`](../journeys.md), in the
same order. Run them one at a time, in order: each prompt assumes every earlier journey is merged.
Each one takes its journey from the requirement, design and mocks through test-first slices to a
narrated video and a pull request.

Every prompt builds its screens for the five form factors the mocks draw (XS, S, M, L and XL,
L2-058) and says what its own screens do with the room. Every prompt ends with a narrated video
of the journey, made from the running app to the standard in
[`docs/videos/README.md`](../videos/README.md): a warm Kokoro voice from Hugging Face, soca from
Pixabay under it, designed transitions, and no captions burned in.

| # | Journey | Requirements | Effort (days) |
|---|---------|--------------|---------------|
| 1 | [Start a Popkin](01-start-a-popkin.md) | L2-003, L2-004, L2-005, L2-007, L2-008, L2-009, L2-010, L2-011 (AC5, AC6), L2-050 | 10 |
| 2 | [Join by invite](02-join-by-invite.md) | L2-012, L2-013, L2-014 (AC1, AC3, AC5), L2-016 (AC1, AC2), L2-051 | 5 |
| 3 | [Chat with everyone](03-chat-with-everyone.md) | L2-021, L2-027, L2-028, L2-014 (AC2, AC4), L2-019 (AC7) | 5 |
| 4 | [Popkin home](04-popkin-home.md) | L2-019, L2-011 (AC1 to AC4), L2-044 (AC5), L2-055 | 3 |
| 5 | [Share photos](05-share-photos.md) | L2-031, L2-032, L2-033 | 5 |
| 6 | [Come back](06-come-back.md) | L2-006, L2-007 (AC1, AC2), L2-017, L2-018, L2-015 (AC1 to AC4), L2-056 | 3 |
| 7 | [Group call](07-group-call.md) | L2-029, L2-030 (AC1 to AC7) | 8 |
| 8 | [Rate an experience](08-rate-an-experience.md) | L2-037, L2-038, L2-039, L2-040, L2-041 | 5 |
| 9 | [Wrap up](09-wrap-up.md) | L2-043, L2-044 (AC1 to AC4), L2-045, L2-046, L2-016 (AC3), L2-020 (AC1, AC2 for Invite people and Wrap up) | 5 |
| 10 | [Discover Popkin](10-discover-popkin.md) | L2-001, L2-002, L2-061 | 2 |
| 11 | [Direct message](11-direct-message.md) | L2-022, L2-023, L2-030 (AC8), L2-051 | 3 |
| 12 | [React and reply](12-react-and-reply.md) | L2-024, L2-025, L2-023 (AC3 for reactions and replies) | 3 |
| 13 | [Photos in chat](13-photos-in-chat.md) | L2-026, L2-023 (AC3 for photos) | 2 |
| 14 | [Engage with a photo](14-engage-with-a-photo.md) | L2-034, L2-035, L2-036 | 3 |
| 15 | [Join by code](15-join-by-code.md) | L2-015 (AC5, AC6), L2-053 | 1 |
| 16 | [Change Popkin settings](16-change-popkin-settings.md) | L2-020 (AC1, AC3 to AC6), L2-008, L2-009 | 2 |
| 17 | [Manage account](17-manage-account.md) | L2-048, L2-059, L2-050 | 2 |
| 18 | [Leave a Popkin](18-leave-a-popkin.md) | L2-047, L2-020 (AC2) | 1 |
| 19 | [Delete account](19-delete-account.md) | L2-049, L2-054 | 2 |
| 20 | [Say keen](20-say-keen.md) | L2-042 | 1 |
