import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { SPEAKING_SAMPLE_MS, heardSpeaking, soundLevel } from './sound-level';
import { SpeakingMeter } from './speaking-meter';

interface Watched {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  samples: Uint8Array<ArrayBuffer>;
  lastHeard: number | null;
}

/**
 * `SpeakingMeter` with Web Audio: one analyser per person, measured on a timer. The sound is
 * only measured, on the device; nothing is recorded or sent.
 */
@Injectable()
export class BrowserSpeakingMeter implements SpeakingMeter {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly heard = signal<ReadonlySet<string>>(new Set());
  private readonly watched = new Map<string, Watched>();
  private context?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;

  readonly speaking = this.heard.asReadonly();

  watch(membershipId: string, stream: MediaStream): void {
    this.unwatch(membershipId);
    const AudioContextClass = this.view?.AudioContext;
    if (!AudioContextClass || stream.getAudioTracks().length === 0) return;
    try {
      this.context ??= new AudioContextClass();
      void this.context.resume();
      const source = this.context.createMediaStreamSource(stream);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this.watched.set(membershipId, {
        source,
        analyser,
        samples: new Uint8Array(analyser.fftSize),
        lastHeard: null,
      });
    } catch {
      // No ring for someone whose sound cannot be measured; the call goes on.
      return;
    }
    this.timer ??= setInterval(() => this.measure(), SPEAKING_SAMPLE_MS);
  }

  unwatch(membershipId: string): void {
    const watched = this.watched.get(membershipId);
    if (!watched) return;
    watched.source.disconnect();
    this.watched.delete(membershipId);
    if (this.heard().has(membershipId)) {
      this.heard.update((heard) => new Set([...heard].filter((id) => id !== membershipId)));
    }
  }

  clear(): void {
    [...this.watched.keys()].forEach((membershipId) => this.unwatch(membershipId));
    clearInterval(this.timer);
    this.timer = undefined;
    void this.context?.close();
    this.context = undefined;
    this.heard.set(new Set());
  }

  private measure(): void {
    const now = Date.now();
    const speaking = new Set<string>();
    for (const [membershipId, watched] of this.watched) {
      watched.analyser.getByteTimeDomainData(watched.samples);
      watched.lastHeard = heardSpeaking(soundLevel(watched.samples), watched.lastHeard, now);
      if (watched.lastHeard !== null) speaking.add(membershipId);
    }
    const before = this.heard();
    if (speaking.size !== before.size || [...speaking].some((id) => !before.has(id))) {
      this.heard.set(speaking);
    }
  }
}
