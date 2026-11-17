/** What a reminder is of (L2-140 AC1, L2-133 AC2, L2-145 AC4). */
export type ReminderKind = 'KeyDate' | 'FollowUp' | 'Habit';

/** An in-app reminder, shown until dismissed (docs/detailed-designs/contacts/reminders). */
export interface ContactReminderView {
  id: string;
  kind: ReminderKind;
  contactId: string | null;
  firstName: string | null;
  /** "Grace turns 33 on Saturday". */
  words: string;
  dueOn: string;
}

/** A device that allowed notifications (ADR 0028). */
export interface PushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
}
