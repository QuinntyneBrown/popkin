import type { Page } from '@playwright/test';
import { hubOf } from './hub';

/**
 * The other people of a call, in the page itself: no test reaches another machine or a media
 * relay. When the app offers someone a link, this answers it with a connection of its own, a
 * moving picture and a sound a spec can raise, and the two exchange their signals through the
 * hub stub as they would through `PopkinHub`. The media then really flows, inside the browser.
 */
interface Signal {
  type: 'offer' | 'answer' | 'candidate';
  payload: string;
}

declare global {
  interface Window {
    pkFarEnd: {
      receive(membershipId: string, signal: Signal): Promise<void>;
      volume(membershipId: string, level: number): void;
      hangUp(membershipId: string): void;
    };
    pkFarEndSays(membershipId: string, signal: Signal): Promise<void>;
  }
}

export async function aFarEnd(page: Page, callId: string): Promise<void> {
  const hub = hubOf(page);
  await page.exposeFunction('pkFarEndSays', (membershipId: string, signal: Signal) =>
    hub.push('Signal', callId, membershipId, signal),
  );
  await page.addInitScript(() => {
    const ends = new Map<string, { peer: RTCPeerConnection; gain: GainNode }>();
    const media = (): { stream: MediaStream; gain: GainNode } => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d');
      let tick = 0;
      setInterval(() => {
        if (!context) return;
        context.fillStyle = tick++ % 2 ? '#4d3a2a' : '#4e3b2b';
        context.fillRect(0, 0, 320, 240);
      }, 100);
      const audio = new AudioContext();
      void audio.resume();
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.value = 0;
      const out = audio.createMediaStreamDestination();
      tone.connect(gain).connect(out);
      tone.start();
      return {
        stream: new MediaStream([
          out.stream.getAudioTracks()[0],
          canvas.captureStream(10).getVideoTracks()[0],
        ]),
        gain,
      };
    };
    window.pkFarEnd = {
      async receive(membershipId, signal) {
        const data: unknown = JSON.parse(signal.payload);
        if (signal.type === 'offer') {
          ends.get(membershipId)?.peer.close();
          const peer = new RTCPeerConnection();
          const { stream, gain } = media();
          stream.getTracks().forEach((track) => peer.addTrack(track, stream));
          peer.onicecandidate = ({ candidate }) => {
            if (!candidate) return;
            void window.pkFarEndSays(membershipId, {
              type: 'candidate',
              payload: JSON.stringify(candidate.toJSON()),
            });
          };
          ends.set(membershipId, { peer, gain });
          await peer.setRemoteDescription(data as RTCSessionDescriptionInit);
          await peer.setLocalDescription(await peer.createAnswer());
          await window.pkFarEndSays(membershipId, {
            type: 'answer',
            payload: JSON.stringify(peer.localDescription),
          });
        } else if (signal.type === 'candidate') {
          await ends.get(membershipId)?.peer.addIceCandidate(data as RTCIceCandidateInit);
        }
      },
      volume(membershipId, level) {
        const end = ends.get(membershipId);
        if (end) end.gain.gain.value = level;
      },
      hangUp(membershipId) {
        ends.get(membershipId)?.peer.close();
        ends.delete(membershipId);
      },
    };
  });
  hub.onInvoke('SendSignal', (args) => {
    const [, to, signal] = args as [string, string, Signal];
    void page
      .evaluate(([membershipId, sent]) => window.pkFarEnd.receive(membershipId, sent), [
        to,
        signal,
      ] as const)
      // The page may have closed while a late candidate was on its way.
      .catch(() => undefined);
  });
}

/** Someone at the far end says something, or stops. */
export async function says(page: Page, membershipId: string, level = 0.8): Promise<void> {
  await page.evaluate(([id, loud]) => window.pkFarEnd.volume(id, loud), [
    membershipId,
    level,
  ] as const);
}
