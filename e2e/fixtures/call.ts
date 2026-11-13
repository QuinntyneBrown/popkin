import type { Page, Route } from '@playwright/test';
import { aCallDevice, type DeviceAnswer } from './call-device';
import { people, popkinId } from './chat';
import { aFarEnd } from './far-end';
import { type Home, homeNow, maraAtHome } from './home';
import type { Hub } from './hub';
import { problem } from './stubs';

/**
 * The group call of Lakeside Weekend, answered in memory (ADR 0005): who is on it, what the
 * app asked of it, and the events the hub would send. No media relay is reached: the call's
 * answer names none.
 */
export const callUrl = `/p/${popkinId}/call`;
export const callId = '00000000-0000-4000-c000-000000000001';

type Person = (typeof people)[keyof typeof people];

export interface OnCall {
  membershipId: string;
  firstName: string;
  name: string;
  avatar: { initials: string; accent: string; photoUrl: string | null };
  micOn: boolean;
  cameraOn: boolean;
  mediaVersion: number;
  joinedAt: string;
}

const onCall = (person: Person, name: string, more: Partial<OnCall> = {}): OnCall => ({
  membershipId: person.membershipId,
  firstName: name.split(' ')[0],
  name,
  avatar: person.avatar,
  micOn: true,
  cameraOn: true,
  mediaVersion: 1,
  joinedAt: new Date(homeNow.getTime() - 60_000).toISOString(),
  ...more,
});

/** The people of the mocks' call. Ruth's camera is off; Sam's is too, and Sam is muted. */
export const callers = {
  mara: onCall(people.mara, 'Mara Okafor'),
  walt: onCall(people.walt, 'Walt Brennan'),
  ellie: onCall(people.ellie, 'Ellie Brennan'),
  dev: onCall(people.dev, 'Dev Patel'),
  ruth: onCall(people.ruth, 'Ruth Lindqvist', { cameraOn: false }),
  sam: {
    membershipId: '00000000-0000-4000-8000-so0000000000',
    firstName: 'Sam',
    name: 'Sam Ortega',
    avatar: { initials: 'SO', accent: 'Amber', photoUrl: null },
    micOn: false,
    cameraOn: false,
    mediaVersion: 1,
    joinedAt: new Date(homeNow.getTime() - 60_000).toISOString(),
  } satisfies OnCall,
};

/** Someone else, for a call with more people than the mocks draw. */
export const guest = (n: number): OnCall => ({
  membershipId: `00000000-0000-4000-8000-9${String(n).padStart(11, '0')}`,
  firstName: `Guest${n}`,
  name: `Guest${n} Example`,
  avatar: { initials: `G${n % 10}`, accent: 'Sky', photoUrl: null },
  micOn: true,
  cameraOn: false,
  mediaVersion: 1,
  joinedAt: new Date(homeNow.getTime() - 60_000).toISOString(),
});

type Failure = 'server' | 'not-found' | 'wrapped-up';

export class Call {
  /** Who is on the call apart from Mara; empty with `underWay` false means no call. */
  others: OnCall[] = [];
  /** Whether a call is under way before Mara does anything. */
  underWay = false;
  /** Whether Mara is on it. */
  maraIsOn = false;
  /** When the call started: 12 minutes 48 seconds before the mocks' moment, as they draw it. */
  startedAt = new Date(homeNow.getTime() - (12 * 60 + 48) * 1000).toISOString();
  version = 1;
  /** Where Mara stands among the people on the call; last, as the one who just joined. */
  maraAt: number | null = null;
  /** How long ago a call Mara starts began, for a state the mocks draw some seconds in. */
  startedAgo = 0;

  /** What the app asked: each join's microphone and camera, each change of them, each leave. */
  readonly joined: { micOn: boolean; cameraOn: boolean }[] = [];
  readonly switched: { micOn: boolean; cameraOn: boolean }[] = [];
  left = 0;
  readCurrent = 0;

  private failing: Failure | null = null;
  private held?: Promise<void>;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route(`**/api/popkins/${popkinId}/calls**`, (route) => this.answer(route));
  }

  /** Joining fails this way until `recover`. */
  fail(how: Failure = 'server'): void {
    this.failing = how;
  }

  recover(): void {
    this.failing = null;
  }

  /** Joining does not answer until the returned function is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.held = new Promise((resolve) => (release = resolve));
    return release;
  }

  /** Someone starts the call, or joins it: counted for the Popkin and told to those on it. */
  async joins(hub: Hub, person: OnCall): Promise<void> {
    this.underWay = true;
    this.others.push(person);
    await this.changed(hub);
    if (this.maraIsOn) await hub.push('ParticipantJoined', callId, person);
  }

  async leaves(hub: Hub, person: OnCall): Promise<void> {
    this.others = this.others.filter((one) => one.membershipId !== person.membershipId);
    if (this.maraIsOn) await hub.push('ParticipantLeft', callId, person.membershipId);
    if (this.count() === 0) return this.ends(hub);
    await this.changed(hub);
  }

  /** The last person left: the call is over for everyone. */
  async ends(hub: Hub): Promise<void> {
    this.underWay = false;
    this.others = [];
    await hub.push('CallEnded', popkinId, callId);
  }

  /** Someone switches their microphone or camera. */
  async switches(
    hub: Hub,
    person: OnCall,
    to: { micOn: boolean; cameraOn: boolean },
    version = person.mediaVersion + 1,
  ): Promise<void> {
    // The cast is shared by every spec: what changes is this call's copy of the person.
    this.others = this.others.map((one) =>
      one.membershipId === person.membershipId ? { ...one, ...to, mediaVersion: version } : one,
    );
    await hub.push(
      'ParticipantMediaChanged',
      callId,
      person.membershipId,
      version,
      to.micOn,
      to.cameraOn,
    );
  }

  private count(): number {
    return this.others.length + (this.maraIsOn ? 1 : 0);
  }

  private async changed(hub: Hub): Promise<void> {
    await hub.push('CallChanged', popkinId, callId, ++this.version, this.count());
  }

  private dto() {
    return {
      id: callId,
      startedAt: this.startedAt,
      version: this.version,
      participantCount: this.count(),
    };
  }

  private async answer(route: Route): Promise<void> {
    const request = route.request();
    const rest = new URL(request.url()).pathname.split(`${popkinId}/calls`)[1];
    const method = request.method();
    if (method === 'GET' && rest === '/current') {
      this.readCurrent++;
      return this.underWay
        ? route.fulfill({ json: this.dto() })
        : route.fulfill({ status: 204, body: '' });
    }
    if (method === 'POST' && rest === '') {
      await this.held;
      if (this.failing) {
        const refusal =
          this.failing === 'not-found'
            ? problem(404, 'popkin_not_found')
            : this.failing === 'wrapped-up'
              ? problem(409, 'popkin_wrapped_up')
              : problem(500, 'server_error');
        return route.fulfill({ status: refusal.status, json: refusal.body });
      }
      const state = request.postDataJSON() as { micOn: boolean; cameraOn: boolean };
      this.joined.push(state);
      const starts = !this.underWay;
      if (starts)
        this.startedAt = new Date(await this.page.evaluate(() => Date.now())).toISOString();
      this.underWay = true;
      this.maraIsOn = true;
      this.version++;
      return route.fulfill({
        status: starts ? 201 : 200,
        json: {
          call: this.dto(),
          viewerMembershipId: people.mara.membershipId,
          participants: this.others.toSpliced(this.maraAt ?? this.others.length, 0, {
            ...callers.mara,
            ...state,
          }),
          iceServers: [],
        },
      });
    }
    if (method === 'POST' && rest === `/${callId}/leave`) {
      this.left++;
      this.maraIsOn = false;
      if (this.count() === 0) this.underWay = false;
      return route.fulfill({ status: 204, body: '' });
    }
    if (method === 'PATCH' && rest === `/${callId}/participants/me`) {
      this.switched.push(request.postDataJSON() as { micOn: boolean; cameraOn: boolean });
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fallback();
  }
}

const calls = new WeakMap<Page, Call>();

export function callOf(page: Page): Call {
  const call = calls.get(page);
  if (!call) throw new Error('This page has no call.');
  return call;
}

/**
 * Mara in Lakeside Weekend on the mocks' day, with a microphone and camera that answer `device`
 * and the Popkin's call answering. `arrange` sets who is on the call already.
 */
export async function maraWithACall(
  page: Page,
  arrange?: (call: Call, home: Home) => void,
  device: DeviceAnswer = 'allowed',
): Promise<Call> {
  await page.clock.install({ time: homeNow });
  await aCallDevice(page, device);
  const home = await maraAtHome(page);
  await aFarEnd(page, callId);
  const call = new Call(page);
  arrange?.(call, home);
  await call.install();
  calls.set(page, call);
  return call;
}

/** The six of the mocks' call, less Mara: she joins it. */
export function theMocksCall(call: Call): void {
  call.underWay = true;
  call.others = [callers.walt, callers.ellie, callers.dev, callers.ruth, callers.sam];
}
