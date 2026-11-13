import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CallMediaState,
  CallParticipantView,
  CallSignal,
  JoinedCallView,
} from '../../models/calls';
import { ThreadView } from '../../models/chat';
import { PopkinHomeView } from '../../models/home';
import { CHAT_API } from '../chat/chat-api';
import { ErrorScreens } from '../error-screens';
import { POPKINS_API } from '../popkins/popkins-api';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CALL_MEDIA, CallMediaProblem } from './call-media';
import { CallSession, CallTile } from './call-session';
import { CALLS_API } from './calls-api';
import { PEER_LINKS } from './peer-links';
import { SPEAKING_METER } from './speaking-meter';

const started = new Date(2026, 8, 12, 12, 0, 0);

const person = (
  membershipId: string,
  name: string,
  more: Partial<CallParticipantView> = {},
): CallParticipantView => ({
  membershipId,
  firstName: name.split(' ')[0],
  name,
  avatar: { initials: name.slice(0, 2).toUpperCase(), accent: 'Coral', photoUrl: null },
  micOn: true,
  cameraOn: true,
  mediaVersion: 1,
  joinedAt: started.toISOString(),
  ...more,
});
const mara = person('m-mara', 'Mara Okafor');
const walt = person('m-walt', 'Walt Brennan');
const dev = person('m-dev', 'Dev Patel');

const lakeside = {
  id: 'lakeside',
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  memberCount: 14,
} as PopkinHomeView;

interface Track {
  kind: string;
  enabled: boolean;
  stop: ReturnType<typeof vi.fn>;
}
function stream(): MediaStream & { mic: Track; camera: Track } {
  const mic: Track = { kind: 'audio', enabled: true, stop: vi.fn() };
  const camera: Track = { kind: 'video', enabled: true, stop: vi.fn() };
  return {
    mic,
    camera,
    getTracks: () => [mic, camera],
    getAudioTracks: () => [mic],
    getVideoTracks: () => [camera],
  } as unknown as MediaStream & { mic: Track; camera: Track };
}

describe('CallSession', () => {
  let media: MediaStream & { mic: Track; camera: Track };
  let mediaProblem: CallMediaProblem | null;
  let asked: number;
  let onCall: CallParticipantView[];
  let joinFails: number | null;
  let joins: { popkinId: string; media: CallMediaState; threadId?: string }[];
  let directFails: number | null;
  let leaves: string[];
  let patches: CallMediaState[];
  let patch: Subject<void>;
  let patchFails: boolean;
  let hubJoins: string[];
  let sent: { to: string; signal: CallSignal }[];
  let refuseSignals: boolean;
  let events: Record<
    | 'participantJoined'
    | 'participantLeft'
    | 'participantMediaChanged'
    | 'signal'
    | 'callEnded'
    | 'reconnected',
    Subject<never>
  >;
  let links: {
    signal$: Subject<{ to: string; signal: CallSignal }>;
    stream$: Subject<{ membershipId: string; stream: MediaStream }>;
    lost$: Subject<string>;
    open: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    receive: ReturnType<typeof vi.fn>;
    drop: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let speaking: ReturnType<typeof signal<ReadonlySet<string>>>;
  let meter: { watch: ReturnType<typeof vi.fn>; unwatch: ReturnType<typeof vi.fn> };
  let notFound: number;
  let session: CallSession;

  const emit = (name: keyof typeof events, value?: unknown) =>
    (events[name] as unknown as Subject<unknown>).next(value);
  const settle = () => vi.advanceTimersByTimeAsync(0);
  const joined = (): JoinedCallView => ({
    call: {
      id: `call-${joins.at(-1)?.popkinId}`,
      startedAt: started.toISOString(),
      version: 1,
      participantCount: onCall.length,
      threadId: joins.at(-1)?.threadId ?? null,
    },
    viewerMembershipId: 'm-mara',
    participants: onCall,
    iceServers: [{ urls: ['turn:relay.example'], username: 'u', credential: 'c' }],
  });
  const begin = async (popkinId = 'lakeside') => {
    session.start(popkinId, `/p/${popkinId}`);
    await settle();
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(started.getTime() + 12_000) });
    media = stream();
    mediaProblem = null;
    asked = 0;
    onCall = [walt, mara];
    joinFails = null;
    joins = [];
    directFails = null;
    leaves = [];
    patches = [];
    patch = new Subject();
    patchFails = false;
    hubJoins = [];
    sent = [];
    refuseSignals = false;
    events = {
      participantJoined: new Subject(),
      participantLeft: new Subject(),
      participantMediaChanged: new Subject(),
      signal: new Subject(),
      callEnded: new Subject(),
      reconnected: new Subject(),
    };
    links = {
      signal$: new Subject(),
      stream$: new Subject(),
      lost$: new Subject(),
      open: vi.fn(),
      connect: vi.fn(),
      receive: vi.fn(),
      drop: vi.fn(),
      close: vi.fn(),
    };
    speaking = signal<ReadonlySet<string>>(new Set());
    meter = { watch: vi.fn(), unwatch: vi.fn() };
    notFound = 0;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CALL_MEDIA,
          useValue: {
            open: () => {
              asked++;
              return mediaProblem ? Promise.reject(mediaProblem) : Promise.resolve(media);
            },
          },
        },
        {
          provide: CALLS_API,
          useValue: {
            join: (
              popkinId: string,
              state: CallMediaState,
              threadId?: string,
            ): Observable<JoinedCallView> => {
              if (joinFails) return throwError(() => new HttpErrorResponse({ status: joinFails! }));
              joins.push({ popkinId, media: state, ...(threadId ? { threadId } : {}) });
              return of(joined());
            },
            leave: (_: string, callId: string) => {
              leaves.push(callId);
              return of(undefined);
            },
            setMedia: (_: string, __: string, state: CallMediaState) => {
              patches.push(state);
              return patchFails ? throwError(() => new HttpErrorResponse({ status: 500 })) : patch;
            },
          },
        },
        { provide: POPKINS_API, useValue: { getHome: () => of(lakeside) } },
        {
          provide: CHAT_API,
          useValue: {
            openDirect: (popkinId: string, memberId: string): Observable<ThreadView> =>
              directFails
                ? throwError(() => new HttpErrorResponse({ status: directFails! }))
                : of({
                    id: `t-${memberId}`,
                    popkinId,
                    kind: 'Direct',
                    other: {
                      membershipId: memberId,
                      displayName: 'Walt Brennan',
                      firstName: 'Walt',
                      avatar: { initials: 'WB', accent: 'Sky', photoUrl: null },
                    },
                  } as ThreadView),
          },
        },
        {
          provide: POPKIN_REALTIME,
          useValue: {
            participantJoined$: events.participantJoined,
            participantLeft$: events.participantLeft,
            participantMediaChanged$: events.participantMediaChanged,
            signal$: events.signal,
            callEnded$: events.callEnded,
            reconnected$: events.reconnected,
            start: vi.fn(),
            joinCall: (callId: string) => {
              hubJoins.push(callId);
              return Promise.resolve();
            },
            sendSignal: (_: string, to: string, value: CallSignal) => {
              sent.push({ to, signal: value });
              return refuseSignals ? Promise.reject(new Error('refused')) : Promise.resolve();
            },
          },
        },
        { provide: PEER_LINKS, useValue: links },
        { provide: SPEAKING_METER, useValue: { speaking, clear: vi.fn(), ...meter } },
        { provide: ErrorScreens, useValue: { showNotFound: () => notFound++ } },
      ],
    });
    session = TestBed.inject(CallSession);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('is on no call at first', () => {
    expect(session.status()).toBe('idle');
    expect(session.tiles()).toEqual([]);
  });

  describe('starting', () => {
    it('is connecting, under the Popkin’s name, while the camera and microphone get ready', () => {
      session.start('lakeside', '/p/lakeside');
      expect(session.status()).toBe('connecting');
      expect(session.popkin()).toEqual({ name: 'Lakeside Weekend', emoji: '🏕️', accent: 'teal' });
      expect(session.subtitle()).toBe('Connecting…');
    });

    it('asks for the camera and microphone, then joins with both on', async () => {
      await begin();
      expect(asked).toBe(1);
      expect(joins).toEqual([{ popkinId: 'lakeside', media: { micOn: true, cameraOn: true } }]);
      expect(hubJoins).toEqual(['call-lakeside']);
      expect(session.status()).toBe('connected');
      expect(session.callId()).toBe('call-lakeside');
    });

    it('offers a link to everyone already on the call, and to nobody else', async () => {
      onCall = [walt, dev, mara];
      await begin();
      expect(links.open).toHaveBeenCalledWith('m-mara', media, joined().iceServers);
      expect(links.connect.mock.calls).toEqual([['m-walt'], ['m-dev']]);
    });

    it('says the camera and microphone were refused, and joins nothing', async () => {
      mediaProblem = 'denied';
      await begin();
      expect(session.status()).toBe('denied');
      expect(session.subtitle()).toBe('Not connected');
      expect(joins).toEqual([]);
    });

    it('asks again on Try again', async () => {
      mediaProblem = 'denied';
      await begin();
      mediaProblem = null;
      session.retry();
      await settle();
      expect(asked).toBe(2);
      expect(session.status()).toBe('connected');
    });

    it('fails, and turns the camera and microphone off, when the call cannot be joined', async () => {
      joinFails = 500;
      await begin();
      expect(session.status()).toBe('failed');
      expect(media.mic.stop).toHaveBeenCalled();
      expect(media.camera.stop).toHaveBeenCalled();
    });

    it('opens not-found for a Popkin the person does not belong to', async () => {
      joinFails = 404;
      await begin();
      expect(notFound).toBe(1);
      expect(session.status()).toBe('idle');
    });

    it('asks nothing again when the member returns to the call they are on', async () => {
      await begin();
      await begin();
      expect(asked).toBe(1);
      expect(joins).toHaveLength(1);
    });

    it('leaves the call the member is on before starting another Popkin’s', async () => {
      await begin();
      await begin('thursday');
      expect(leaves).toEqual(['call-lakeside']);
      expect(session.callId()).toBe('call-thursday');
    });

    it('remembers the screen the member came from', async () => {
      session.start('lakeside', '/p/lakeside/chat');
      expect(session.returnUrl()).toBe('/p/lakeside/chat');
    });
  });

  describe('the tiles', () => {
    it('name the member "You" and the others by their first name, in the order they joined', async () => {
      await begin();
      expect(session.tiles()).toMatchObject([
        { membershipId: 'm-walt', name: 'Walt', you: false, stream: null },
        { membershipId: 'm-mara', name: 'You', you: true, stream: media },
      ]);
      expect(session.shape()).toBe('pair');
      expect(session.more()).toBe(0);
    });

    it('show eleven people and count the rest from thirteen on the call', async () => {
      onCall = [...Array.from({ length: 13 }, (_, at) => person(`m-${at}`, `Guest ${at}`)), mara];
      await begin();
      expect(session.tiles()).toHaveLength(11);
      expect(session.tiles().at(-1)?.you).toBe(true);
      expect(session.more()).toBe(3);
    });

    it('show someone’s camera when it arrives, and listen for their voice', async () => {
      await begin();
      const theirs = stream();
      links.stream$.next({ membershipId: 'm-walt', stream: theirs });
      expect(session.tiles()[0].stream).toBe(theirs);
      expect(meter.watch).toHaveBeenCalledWith('m-walt', theirs);
      expect(meter.watch).toHaveBeenCalledWith('m-mara', media);
    });

    it('ring whoever is speaking, unless they are muted', async () => {
      onCall = [walt, person('m-dev', 'Dev Patel', { micOn: false }), mara];
      await begin();
      speaking.set(new Set(['m-walt', 'm-dev']));
      expect(session.tiles().map((tile: CallTile) => tile.speaking)).toEqual([true, false, false]);
    });
  });

  describe('the header and the list of who is on the call', () => {
    it('count the people and the time since the call started', async () => {
      await begin();
      expect(session.subtitle()).toBe('2 on the call · 0:12');
      await vi.advanceTimersByTimeAsync(3_000);
      expect(session.subtitle()).toBe('2 on the call · 0:15');
    });

    it('say the member is alone', async () => {
      onCall = [mara];
      await begin();
      expect(session.alone()).toBe(true);
      expect(session.subtitle()).toBe('Just you · 0:12');
    });

    it('give each person’s full name and microphone in words', async () => {
      onCall = [walt, person('m-dev', 'Dev Patel', { micOn: false }), mara];
      await begin();
      speaking.set(new Set(['m-walt']));
      expect(session.roster()).toMatchObject([
        { name: 'Walt Brennan', mic: 'Speaking', state: 'speaking' },
        { name: 'Dev Patel', mic: 'Muted', state: 'muted' },
        { name: 'Mara Okafor (you)', mic: 'Microphone on', state: 'on' },
      ]);
      expect(session.others()).toBe('11 others in Lakeside Weekend can join anytime.');
    });
  });

  describe('while the call runs', () => {
    beforeEach(() => begin());

    it('adds someone who joins, and waits for their offer', () => {
      emit('participantJoined', { callId: 'call-lakeside', participant: dev });
      emit('participantJoined', { callId: 'call-lakeside', participant: dev });
      expect(session.tiles().map((tile: CallTile) => tile.name)).toEqual(['Walt', 'You', 'Dev']);
      expect(links.connect).toHaveBeenCalledTimes(1);
    });

    it('ignores another call’s events', () => {
      emit('participantJoined', { callId: 'call-elsewhere', participant: dev });
      emit('participantLeft', { callId: 'call-elsewhere', membershipId: 'm-walt' });
      expect(session.tiles()).toHaveLength(2);
    });

    it('removes someone who leaves, and closes their link', () => {
      emit('participantLeft', { callId: 'call-lakeside', membershipId: 'm-walt' });
      expect(session.tiles().map((tile: CallTile) => tile.name)).toEqual(['You']);
      expect(links.drop).toHaveBeenCalledWith('m-walt');
      expect(meter.unwatch).toHaveBeenCalledWith('m-walt');
    });

    it('shows someone’s microphone and camera as they change them', () => {
      const change = { callId: 'call-lakeside', membershipId: 'm-walt' };
      emit('participantMediaChanged', {
        ...change,
        mediaVersion: 3,
        micOn: false,
        cameraOn: false,
      });
      expect(session.tiles()[0]).toMatchObject({ micOn: false, cameraOn: false });
    });

    it('drops a change older than the one it holds', () => {
      const change = { callId: 'call-lakeside', membershipId: 'm-walt' };
      emit('participantMediaChanged', { ...change, mediaVersion: 3, micOn: false, cameraOn: true });
      emit('participantMediaChanged', { ...change, mediaVersion: 2, micOn: true, cameraOn: true });
      expect(session.tiles()[0].micOn).toBe(false);
    });

    it('hands a signal someone sent to their link', () => {
      const offer: CallSignal = { type: 'offer', payload: 'sdp' };
      emit('signal', { callId: 'call-lakeside', fromMembershipId: 'm-walt', signal: offer });
      emit('signal', { callId: 'call-elsewhere', fromMembershipId: 'm-walt', signal: offer });
      expect(links.receive.mock.calls).toEqual([['m-walt', offer]]);
    });

    it('carries each signal of a link to its person, in order', async () => {
      links.signal$.next({ to: 'm-walt', signal: { type: 'offer', payload: 'a' } });
      links.signal$.next({ to: 'm-walt', signal: { type: 'candidate', payload: 'b' } });
      links.signal$.next({ to: 'm-walt', signal: { type: 'candidate', payload: 'b' } });
      await settle();
      expect(sent.map((one) => one.signal.payload)).toEqual(['a', 'b', 'b']);
    });

    it('begins again with someone once when a signal to them is refused, then fails', async () => {
      refuseSignals = true;
      links.signal$.next({ to: 'm-walt', signal: { type: 'offer', payload: 'a' } });
      await settle();
      expect(links.drop).toHaveBeenCalledWith('m-walt');
      expect(links.connect.mock.calls).toEqual([['m-walt'], ['m-walt']]);
      expect(session.status()).toBe('connected');
      links.signal$.next({ to: 'm-walt', signal: { type: 'offer', payload: 'b' } });
      await settle();
      expect(session.status()).toBe('failed');
    });

    it('does not begin again with someone who has left', async () => {
      refuseSignals = true;
      emit('participantLeft', { callId: 'call-lakeside', membershipId: 'm-walt' });
      links.signal$.next({ to: 'm-walt', signal: { type: 'candidate', payload: 'a' } });
      await settle();
      expect(links.connect).toHaveBeenCalledTimes(1);
      expect(session.status()).toBe('connected');
    });

    it('offers again to someone whose link broke', () => {
      links.lost$.next('m-walt');
      expect(links.drop).toHaveBeenCalledWith('m-walt');
      expect(links.connect).toHaveBeenCalledTimes(2);
    });

    it('joins again after the connection returns, and catches up on who is there', async () => {
      onCall = [dev, mara];
      emit('reconnected');
      await settle();
      expect(joins).toHaveLength(2);
      expect(hubJoins).toEqual(['call-lakeside', 'call-lakeside']);
      expect(session.tiles().map((tile: CallTile) => tile.name)).toEqual(['Dev', 'You']);
      expect(links.drop).toHaveBeenCalledWith('m-walt');
      expect(links.connect).toHaveBeenLastCalledWith('m-dev');
      expect(asked).toBe(1);
    });

    it('begins every link again when the member had been dropped from the call meanwhile', async () => {
      onCall = [walt, { ...mara, joinedAt: new Date(started.getTime() + 60_000).toISOString() }];
      emit('reconnected');
      await settle();
      expect(links.drop).toHaveBeenCalledWith('m-walt');
      expect(links.connect.mock.calls).toEqual([['m-walt'], ['m-walt']]);
    });

    it('fails when the call cannot be joined again', async () => {
      joinFails = 409;
      emit('reconnected');
      await settle();
      expect(session.status()).toBe('failed');
    });

    it('is not connected when the server says the call ended', () => {
      emit('callEnded', { popkinId: 'lakeside', callId: 'call-lakeside' });
      expect(session.status()).toBe('failed');
      expect(media.mic.stop).toHaveBeenCalled();
      expect(links.close).toHaveBeenCalled();
    });
  });

  describe('the controls', () => {
    beforeEach(() => begin());

    it('mute the microphone at once and tell the others', () => {
      session.toggleMic();
      expect(media.mic.enabled).toBe(false);
      expect(session.micOn()).toBe(false);
      expect(session.tiles()[1].micOn).toBe(false);
      expect(patches).toEqual([{ micOn: false, cameraOn: true }]);
    });

    it('turn the camera off at once and tell the others', () => {
      session.toggleCamera();
      expect(media.camera.enabled).toBe(false);
      expect(session.cameraOn()).toBe(false);
      expect(session.tiles()[1].cameraOn).toBe(false);
      expect(patches).toEqual([{ micOn: true, cameraOn: false }]);
    });

    it('send only the last of several quick presses once the first is answered', () => {
      for (let press = 0; press < 5; press++) session.toggleMic();
      expect(patches).toEqual([{ micOn: false, cameraOn: true }]);
      patch.next();
      patch.complete();
      expect(patches).toHaveLength(1);
      session.toggleMic();
      session.toggleCamera();
      session.toggleMic();
      expect(session.micOn()).toBe(false);
    });

    it('send the newest state after the one in flight', () => {
      session.toggleMic();
      session.toggleCamera();
      const first = patch;
      patch = new Subject();
      first.next();
      first.complete();
      expect(patches).toEqual([
        { micOn: false, cameraOn: true },
        { micOn: false, cameraOn: false },
      ]);
    });

    it('keep the microphone off when the others could not be told', () => {
      patchFails = true;
      session.toggleMic();
      expect(media.mic.enabled).toBe(false);
      expect(session.micOn()).toBe(false);
    });

    it('leave: stop the camera and microphone, close every link and tell the API', () => {
      session.leave();
      expect(media.mic.stop).toHaveBeenCalled();
      expect(media.camera.stop).toHaveBeenCalled();
      expect(links.close).toHaveBeenCalled();
      expect(leaves).toEqual(['call-lakeside']);
      expect(session.status()).toBe('idle');
      expect(session.callId()).toBeNull();
      expect(session.tiles()).toEqual([]);
    });

    it('hear nothing of the call after leaving', () => {
      session.leave();
      emit('participantJoined', { callId: 'call-lakeside', participant: dev });
      expect(session.tiles()).toEqual([]);
    });
  });

  describe('a direct call (L2-030 AC8)', () => {
    const call = async () => {
      session.start('lakeside', '/p/lakeside/chat/m-walt', 'm-walt');
      await settle();
    };

    it('joins the call of the direct message with that member', async () => {
      await call();
      expect(joins).toEqual([
        { popkinId: 'lakeside', media: { micOn: true, cameraOn: true }, threadId: 't-m-walt' },
      ]);
      expect(session.status()).toBe('connected');
    });

    it('is named after the other member, and says who is on it and who may join', async () => {
      await call();
      expect(session.other()).toMatchObject({ displayName: 'Walt Brennan', firstName: 'Walt' });
      expect(session.subtitle()).toBe('Just the two of you · 0:12');
      expect(session.others()).toBe('Only you and Walt can join this call.');
    });

    it('is another call than the group call of the same Popkin', async () => {
      await call();
      session.start('lakeside', '/p/lakeside');
      await settle();
      expect(leaves).toEqual(['call-lakeside']);
      expect(joins).toHaveLength(2);
      expect(joins[1].threadId).toBeUndefined();
      expect(session.other()).toBeNull();
    });

    it('is returned to, not begun again, when it is under way', async () => {
      await call();
      await call();
      expect(joins).toHaveLength(1);
    });

    it('is not found for a member the Popkin does not have', async () => {
      directFails = 404;
      await call();
      expect(notFound).toBe(1);
      expect(joins).toEqual([]);
    });

    it('says the call failed when the direct message could not be read', async () => {
      directFails = 500;
      await call();
      expect(session.status()).toBe('failed');
    });
  });
});
