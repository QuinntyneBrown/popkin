import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  CallMediaState,
  CallParticipantView,
  CallSignal,
  JoinedCallView,
} from '../../models/calls';
import { ThreadMemberView } from '../../models/chat';
import { PopkinHomeView } from '../../models/home';
import { AvatarView } from '../../models/invite';
import { accentOf } from '../../models/popkin';
import { CHAT_API } from '../chat/chat-api';
import { ErrorScreens } from '../error-screens';
import { POPKINS_API } from '../popkins/popkins-api';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CALL_MEDIA } from './call-media';
import {
  CallGridShape,
  callElapsed,
  callGrid,
  callSubtitle,
  directCallNote,
  directCallSubtitle,
  micWords,
  othersLine,
  shownOnCall,
} from './call-text';
import { CALLS_API } from './calls-api';
import { PEER_LINKS } from './peer-links';
import { SPEAKING_METER } from './speaking-meter';

/**
 * `idle`: on no call. `connecting`: the camera and microphone are being asked for and the call
 * joined. `denied`: they were refused. `failed`: the call could not be joined, or was lost.
 */
export type CallStatus = 'idle' | 'connecting' | 'connected' | 'denied' | 'failed';

/** One person's tile on the stage (L2-030 AC2 to AC4). */
export interface CallTile {
  membershipId: string;
  /** Their first name, or "You". */
  name: string;
  avatar: AvatarView;
  /** Their camera and microphone, once it has arrived; the member's own at once. */
  stream: MediaStream | null;
  micOn: boolean;
  cameraOn: boolean;
  speaking: boolean;
  you: boolean;
}

/** One person in the list of who is on the call (L2-058 AC12). */
export interface CallRosterRow {
  membershipId: string;
  name: string;
  avatar: AvatarView;
  /** Their microphone in words: "Speaking", "Microphone on" or "Muted". */
  mic: string;
  state: 'speaking' | 'on' | 'muted';
}

/**
 * The call the member is on (docs/detailed-designs/calls). There is one for the whole app, so a
 * call goes on while the member looks at another screen ("Minimise call", L2-030 AC7). It asks
 * for the camera and microphone, joins the Popkin's group call, carries the signals that set up
 * a link to each other person, and keeps who is on the call and what each has switched on.
 */
@Injectable({ providedIn: 'root' })
export class CallSession {
  private readonly api = inject(CALLS_API);
  private readonly popkins = inject(POPKINS_API);
  private readonly chat = inject(CHAT_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly media = inject(CALL_MEDIA);
  private readonly links = inject(PEER_LINKS);
  private readonly meter = inject(SPEAKING_METER);
  private readonly errors = inject(ErrorScreens);

  /** Rises each time the session starts or ends a call; work begun under an older one stops. */
  private run = 0;
  private listening?: Subscription;
  private ticking?: ReturnType<typeof setInterval>;
  /** Signals are sent one after another, so they arrive in the order they were made. */
  private sending: Promise<void> = Promise.resolve();
  /** The people a link was begun again with, after a signal to them was refused. */
  private readonly begunAgain = new Set<string>();
  private telling = false;
  private told: CallMediaState | null = null;
  /** The direct message of the call; none for the group call. */
  private threadId?: string;

  private readonly home = signal<PopkinHomeView | null>(null);
  private readonly people = signal<CallParticipantView[]>([]);
  private readonly streams = signal<ReadonlyMap<string, MediaStream>>(new Map());
  private readonly local = signal<MediaStream | null>(null);
  private readonly viewer = signal('');
  private readonly startedAt = signal<string | null>(null);
  private readonly now = signal(new Date());

  readonly status = signal<CallStatus>('idle');
  /** The Popkin whose call this is, from the moment it is asked for. */
  readonly popkinId = signal<string | null>(null);
  /** The member a direct call is with, by membership id (L2-030 AC8); null for the group call. */
  readonly memberId = signal<string | null>(null);
  /** That member, once the direct message is read. */
  readonly other = signal<ThreadMemberView | null>(null);
  /** The call the member is on; null until it is joined. */
  readonly callId = signal<string | null>(null);
  /** The screen the member came from, which "Leave" opens (L2-030 AC6). */
  readonly returnUrl = signal('');
  readonly micOn = signal(true);
  readonly cameraOn = signal(true);

  readonly popkin = computed(() => {
    const home = this.home();
    return home ? { name: home.name, emoji: home.emoji, accent: accentOf(home.colour) } : null;
  });

  /** "6 on the call · 12:48", "Just you · 0:12", "Connecting…" or "Not connected". */
  readonly subtitle = computed(() => {
    const startedAt = this.startedAt();
    if (this.status() === 'connecting') return 'Connecting…';
    if (this.status() !== 'connected' || !startedAt) return 'Not connected';
    const elapsed = callElapsed(startedAt, this.now());
    return this.memberId()
      ? directCallSubtitle(this.people().length, elapsed)
      : callSubtitle(this.people().length, elapsed);
  });

  private readonly shown = computed(() =>
    shownOnCall(
      this.people().map((person) => person.membershipId),
      this.viewer(),
    ),
  );

  readonly tiles = computed<CallTile[]>(() => {
    const people = new Map(this.people().map((person) => [person.membershipId, person]));
    const speaking = this.meter.speaking();
    return this.shown().shown.flatMap((membershipId) => {
      const person = people.get(membershipId);
      if (!person) return [];
      const you = membershipId === this.viewer();
      return {
        membershipId,
        name: you ? 'You' : person.firstName,
        avatar: person.avatar,
        stream: you ? this.local() : (this.streams().get(membershipId) ?? null),
        micOn: person.micOn,
        cameraOn: person.cameraOn,
        speaking: person.micOn && speaking.has(membershipId),
        you,
      };
    });
  });
  /** How many people on the call have no tile (L2-029 AC7). */
  readonly more = computed(() => this.shown().more);
  readonly shape = computed<CallGridShape>(() =>
    callGrid(this.tiles().length + (this.more() > 0 ? 1 : 0)),
  );
  /** The member is the only one on the call (L2-029 AC3). */
  readonly alone = computed(() => this.status() === 'connected' && this.people().length === 1);

  readonly roster = computed<CallRosterRow[]>(() => {
    const speaking = this.meter.speaking();
    return this.people().map((person) => {
      const heard = person.micOn && speaking.has(person.membershipId);
      return {
        membershipId: person.membershipId,
        name: person.membershipId === this.viewer() ? `${person.name} (you)` : person.name,
        avatar: person.avatar,
        mic: micWords(person.micOn, heard),
        state: !person.micOn ? 'muted' : heard ? 'speaking' : 'on',
      };
    });
  });
  /** "8 others in Lakeside Weekend can join anytime." */
  readonly others = computed(() => {
    const other = this.other();
    if (this.memberId()) return other ? directCallNote(other.firstName) : '';
    const home = this.home();
    return home ? othersLine(home.name, home.memberCount, this.people().length) : '';
  });

  /**
   * Starts the Popkin's group call or joins it, or, when a member is named, the call of the
   * direct message with them (L2-030 AC8); returns to it if the member is on it already.
   */
  start(popkinId: string, returnUrl: string, memberId?: string): void {
    this.returnUrl.set(returnUrl);
    const busy = this.status() === 'connected' || this.status() === 'connecting';
    if (busy && this.popkinId() === popkinId && this.memberId() === (memberId ?? null)) return;
    if (this.status() !== 'idle') this.leave();
    this.popkinId.set(popkinId);
    this.memberId.set(memberId ?? null);
    this.other.set(null);
    this.micOn.set(true);
    this.cameraOn.set(true);
    this.begin();
  }

  /** Asks for the camera and microphone again, after they were refused or the call was lost. */
  retry(): void {
    if (this.popkinId() && (this.status() === 'denied' || this.status() === 'failed')) {
      this.begin();
    }
  }

  toggleMic(): void {
    this.micOn.update((on) => !on);
    this.applyMedia();
  }

  toggleCamera(): void {
    this.cameraOn.update((on) => !on);
    this.applyMedia();
  }

  /** Leaves at once: the camera and microphone stop before the API answers (L2-030 AC6). */
  leave(): void {
    const popkinId = this.popkinId();
    const callId = this.callId();
    this.end();
    this.status.set('idle');
    this.popkinId.set(null);
    this.memberId.set(null);
    this.other.set(null);
    this.home.set(null);
    // A leave that does not arrive is caught by the hub, which drops a connection that is gone.
    if (popkinId && callId) this.api.leave(popkinId, callId).subscribe({ error: () => undefined });
  }

  private begin(): void {
    const popkinId = this.popkinId();
    if (!popkinId) return;
    const run = ++this.run;
    this.status.set('connecting');
    this.popkins.getHome(popkinId).subscribe({
      next: (home) => {
        if (run === this.run) this.home.set(home);
      },
      error: (error: unknown) => {
        if (run === this.run && notFound(error)) this.gone();
      },
    });
    void this.connect(popkinId, run);
  }

  private async connect(popkinId: string, run: number): Promise<void> {
    let local: MediaStream;
    try {
      local = await this.media.open();
    } catch (problem) {
      if (run === this.run) this.status.set(problem === 'denied' ? 'denied' : 'failed');
      return;
    }
    if (run !== this.run) return stop(local);
    this.local.set(local);
    this.switchTracks();
    try {
      const memberId = this.memberId();
      if (memberId) {
        const thread = await firstValueFrom(this.chat.openDirect(popkinId, memberId));
        if (run !== this.run) return;
        this.threadId = thread.id;
        this.other.set(thread.other);
      } else {
        this.threadId = undefined;
      }
      const joined = await firstValueFrom(
        this.api.join(popkinId, this.mediaState(), this.threadId),
      );
      if (run !== this.run) return;
      this.callId.set(joined.call.id);
      this.viewer.set(joined.viewerMembershipId);
      this.startedAt.set(joined.call.startedAt);
      this.people.set(joined.participants);
      this.told = this.mediaState();
      this.links.open(joined.viewerMembershipId, local, joined.iceServers);
      this.listen(joined.call.id, run);
      await this.realtime.joinCall(joined.call.id);
      if (run !== this.run) return;
      this.othersOf(joined).forEach((person) => this.links.connect(person.membershipId));
      this.meter.watch(joined.viewerMembershipId, local);
      this.now.set(new Date());
      this.ticking = setInterval(() => this.now.set(new Date()), 1000);
      this.status.set('connected');
    } catch (error) {
      if (run !== this.run) return;
      if (notFound(error)) this.gone();
      else this.fail();
    }
  }

  /** Hears the call's events from the hub and the links, until the call ends for the member. */
  private listen(callId: string, run: number): void {
    const realtime = this.realtime;
    const mine = <T extends { callId: string }>(event: T): boolean => event.callId === callId;
    const listening = new Subscription();
    listening.add(
      realtime.participantJoined$.subscribe((event) => {
        if (!mine(event) || this.has(event.participant.membershipId)) return;
        this.begunAgain.delete(event.participant.membershipId);
        // The one who arrives offers the link; this side waits for it.
        this.people.update((people) => [...people, event.participant]);
      }),
    );
    listening.add(
      realtime.participantLeft$.subscribe((event) => {
        if (mine(event)) this.remove(event.membershipId);
      }),
    );
    listening.add(
      realtime.participantMediaChanged$.subscribe((event) => {
        // What the member switched is known here first; the echo of it changes nothing.
        if (!mine(event) || event.membershipId === this.viewer()) return;
        this.people.update((people) =>
          people.map((person) =>
            person.membershipId === event.membershipId && event.mediaVersion > person.mediaVersion
              ? {
                  ...person,
                  micOn: event.micOn,
                  cameraOn: event.cameraOn,
                  mediaVersion: event.mediaVersion,
                }
              : person,
          ),
        );
      }),
    );
    listening.add(
      realtime.signal$.subscribe((event) => {
        if (mine(event)) this.links.receive(event.fromMembershipId, event.signal);
      }),
    );
    listening.add(
      realtime.callEnded$.subscribe((event) => {
        // The server ended a call the member thought they were on: they had been dropped.
        if (mine(event)) this.fail(false);
      }),
    );
    listening.add(realtime.reconnected$.subscribe(() => void this.rejoin(callId, run)));
    listening.add(
      this.links.signal$.subscribe(({ to, signal }) => this.send(callId, to, signal, run)),
    );
    listening.add(
      this.links.stream$.subscribe(({ membershipId, stream }) => {
        if (!this.has(membershipId)) return;
        this.streams.update((streams) => new Map(streams).set(membershipId, stream));
        this.meter.watch(membershipId, stream);
      }),
    );
    listening.add(
      this.links.lost$.subscribe((membershipId) => {
        if (!this.has(membershipId)) return;
        this.links.drop(membershipId);
        this.links.connect(membershipId);
      }),
    );
    this.listening = listening;
  }

  private send(callId: string, to: string, signal: CallSignal, run: number): void {
    this.sending = this.sending
      .then(() => (run === this.run ? this.realtime.sendSignal(callId, to, signal) : undefined))
      .catch(() => {
        if (run !== this.run || !this.has(to)) return;
        // A refused signal leaves a link that never connects: begin it again once, then give up.
        if (this.begunAgain.has(to)) return this.fail();
        this.begunAgain.add(to);
        this.links.drop(to);
        this.links.connect(to);
      });
  }

  /** After the connection returned: the call is joined again and who is on it read again. */
  private async rejoin(callId: string, run: number): Promise<void> {
    const popkinId = this.popkinId();
    if (!popkinId || this.status() !== 'connected') return;
    try {
      const joined = await firstValueFrom(
        this.api.join(popkinId, this.mediaState(), this.threadId),
      );
      if (run !== this.run) return;
      if (joined.call.id !== callId) return this.fail(false);
      const viewer = joined.viewerMembershipId;
      const before = this.people();
      const me = (people: CallParticipantView[]) =>
        people.find((person) => person.membershipId === viewer)?.joinedAt;
      // Dropped from the call while away, and now on it again: the others closed their links.
      const dropped = me(before) !== me(joined.participants);
      const held = dropped ? [] : before.map((person) => person.membershipId);
      const now = new Set(joined.participants.map((person) => person.membershipId));
      before
        .filter((person) => dropped || !now.has(person.membershipId))
        .filter((person) => person.membershipId !== viewer)
        .forEach((person) => this.forget(person.membershipId));
      this.people.set(joined.participants);
      await this.realtime.joinCall(callId);
      if (run !== this.run) return;
      this.othersOf(joined)
        .filter((person) => !held.includes(person.membershipId))
        .forEach((person) => this.links.connect(person.membershipId));
    } catch {
      if (run === this.run) this.fail();
    }
  }

  private othersOf(joined: JoinedCallView): CallParticipantView[] {
    return joined.participants.filter(
      (person) => person.membershipId !== joined.viewerMembershipId,
    );
  }

  private has(membershipId: string): boolean {
    return this.people().some((person) => person.membershipId === membershipId);
  }

  private remove(membershipId: string): void {
    if (!this.has(membershipId)) return;
    this.people.update((people) => people.filter((one) => one.membershipId !== membershipId));
    this.forget(membershipId);
  }

  private forget(membershipId: string): void {
    this.links.drop(membershipId);
    this.meter.unwatch(membershipId);
    this.streams.update((streams) => {
      const next = new Map(streams);
      next.delete(membershipId);
      return next;
    });
  }

  private mediaState(): CallMediaState {
    return { micOn: this.micOn(), cameraOn: this.cameraOn() };
  }

  /** A switched-off microphone or camera sends nothing: the track itself is disabled. */
  private switchTracks(): void {
    const local = this.local();
    local?.getAudioTracks().forEach((track) => (track.enabled = this.micOn()));
    local?.getVideoTracks().forEach((track) => (track.enabled = this.cameraOn()));
  }

  private applyMedia(): void {
    this.switchTracks();
    const state = this.mediaState();
    this.people.update((people) =>
      people.map((person) =>
        person.membershipId === this.viewer() ? { ...person, ...state } : person,
      ),
    );
    this.tell();
  }

  /**
   * Tells the others what the member switched. While one request is in flight only the newest
   * state is kept, and it is sent when the request returns. A request that fails changes
   * nothing here: what was switched off stays off.
   */
  private tell(): void {
    const popkinId = this.popkinId();
    const callId = this.callId();
    const state = this.mediaState();
    if (!popkinId || !callId || this.telling) return;
    if (this.told?.micOn === state.micOn && this.told.cameraOn === state.cameraOn) return;
    const run = this.run;
    const answered = (sent: boolean): void => {
      if (run !== this.run) return;
      this.telling = false;
      if (sent) {
        this.told = state;
        this.tell();
      }
    };
    this.telling = true;
    this.api.setMedia(popkinId, callId, state).subscribe({
      complete: () => answered(true),
      error: () => answered(false),
    });
  }

  /** The Popkin is not one the person belongs to (L2-051 AC1). */
  private gone(): void {
    this.end();
    this.status.set('idle');
    this.popkinId.set(null);
    this.memberId.set(null);
    this.other.set(null);
    this.home.set(null);
    this.errors.showNotFound();
  }

  /** The call is lost; the screen offers to try again. */
  private fail(tellTheApi = true): void {
    const popkinId = this.popkinId();
    const callId = this.callId();
    this.end();
    this.status.set('failed');
    if (tellTheApi && popkinId && callId) {
      this.api.leave(popkinId, callId).subscribe({ error: () => undefined });
    }
  }

  /** Stops the camera and microphone, closes every link and forgets the call. */
  private end(): void {
    this.run++;
    this.listening?.unsubscribe();
    this.listening = undefined;
    clearInterval(this.ticking);
    const local = this.local();
    if (local) stop(local);
    this.links.close();
    this.meter.clear();
    this.local.set(null);
    this.people.set([]);
    this.streams.set(new Map());
    this.callId.set(null);
    this.startedAt.set(null);
    this.viewer.set('');
    this.begunAgain.clear();
    this.telling = false;
    this.told = null;
    this.sending = Promise.resolve();
  }
}

function stop(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

function notFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
