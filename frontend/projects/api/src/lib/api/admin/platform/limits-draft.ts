import { AdminLimit, AdminLimits, LimitChangeRequest, LimitKeyId } from '../../../models/admin';
import { NotificationDialogText } from './notifications-text';

/** One unsaved change, as the save dialog lists it: "Sign-in lasts: 365 → 30 days". */
export interface LimitsChange {
  name: string;
  from: string;
  to: string;
  unit: string;
}

/** Each limit's name and what it counts, as Limits names them (L2-176 AC3). */
const LIMIT_TEXT: Record<LimitKeyId, { name: string; help: string }> = {
  SessionDays: {
    name: 'Sign-in lasts',
    help: 'Days since the person last used Popkin on the device',
  },
};

const WHOLE = /^\d+$/;

export const limitName = (limit: LimitKeyId): string => LIMIT_TEXT[limit].name;

/** "Days since the person last used Popkin on the device · default 365 days". */
export function limitHelp(row: AdminLimit, withDefault: boolean): string {
  const help = LIMIT_TEXT[row.limit].help;
  return withDefault ? `${help} · default ${row.defaultValue} ${row.unit}` : help;
}

/**
 * The Limits page's draft (docs/detailed-designs/admin-platform/limits): the saved limits, the
 * values as typed, each value's error, how many limits are unsaved and what changes. Immutable:
 * `with` gives a new draft. A value is a whole number from 1 to the limit's maximum (L2-176 AC4).
 */
export class LimitsDraft {
  readonly rows: readonly AdminLimit[];
  private readonly values: Readonly<Partial<Record<LimitKeyId, string>>>;

  constructor(
    readonly saved: AdminLimits,
    values?: Partial<Record<LimitKeyId, string>>,
  ) {
    this.rows = [...saved.uploads, ...saved.rates, ...saved.sessions];
    this.values = values ?? Object.fromEntries(this.rows.map((r) => [r.limit, String(r.value)]));
  }

  /** The value of a limit as typed. */
  value(limit: LimitKeyId): string {
    return this.values[limit] ?? '';
  }

  with(limit: LimitKeyId, value: string): LimitsDraft {
    return new LimitsDraft(this.saved, { ...this.values, [limit]: value });
  }

  discarded(): LimitsDraft {
    return new LimitsDraft(this.saved);
  }

  /** What is wrong with a limit's value, or null (L2-176 AC4, L2-117 AC4). */
  error(limit: LimitKeyId): string | null {
    const row = this.row(limit);
    const text = this.value(limit).trim();
    const n = Number(text);
    const max = row.maxValue;
    const ok = WHOLE.test(text) && n >= 1 && (max === null || n <= max);
    if (ok) return null;
    return max === null
      ? 'Enter a whole number of 1 or more.'
      : `Enter a whole number from 1 to ${max}.`;
  }

  get valid(): boolean {
    return this.rows.every((r) => !this.error(r.limit));
  }

  /** What changes, one row per limit whose value differs from the saved one (L2-117 AC5). */
  get changes(): LimitsChange[] {
    return this.rows
      .filter((r) => this.normalised(r.limit) !== String(r.value))
      .map((r) => ({
        name: limitName(r.limit),
        from: String(r.value),
        to: this.normalised(r.limit),
        unit: r.unit,
      }));
  }

  get unsaved(): number {
    return this.changes.length;
  }

  /** The changes of `PUT /api/admin/limits`, without the reason. */
  request(): LimitChangeRequest[] {
    return this.rows
      .filter((r) => this.normalised(r.limit) !== String(r.value))
      .map((r) => ({ limit: r.limit, value: Number(this.normalised(r.limit)) }));
  }

  private row(limit: LimitKeyId): AdminLimit {
    const row = this.rows.find((r) => r.limit === limit);
    if (!row) throw new Error(`No limit ${limit}.`);
    return row;
  }

  /** Trimmed, with whole numbers written plainly ("030" is "30"). */
  private normalised(limit: LimitKeyId): string {
    const text = this.value(limit).trim();
    return WHOLE.test(text) ? String(Number(text)) : text;
  }
}

/** "Save new limits?" (L2-117 AC5, L2-087 AC1). */
export const SAVE_LIMITS_DIALOG: NotificationDialogText = {
  heading: 'Save new limits?',
  description: 'These apply to everyone within a minute:',
  confirm: 'Save',
  busy: 'Saving…',
  keep: 'Cancel',
  placeholder: 'For example: shared tablets at the venue',
};

/** "Limits saved", "{limits} change for everyone within a minute." (L2-117 AC5). */
export function limitsSavedToast(names: readonly string[]): [string, string] {
  const list =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const verb = names.length > 1 ? 'change' : 'changes';
  return ['Limits saved', `${list} ${verb} for everyone within a minute.`];
}
