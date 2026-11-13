import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { CallSignal, IceServerView } from '../../models/calls';
import { PeerLinks } from './peer-links';

interface Link {
  peer: RTCPeerConnection;
  /** Candidates that arrived before the description they belong to. */
  early: RTCIceCandidateInit[];
  /** An offer of this side is being made or awaits its answer. */
  offering: boolean;
  audio: HTMLAudioElement | null;
  stream: MediaStream | null;
}

/**
 * `PeerLinks` with WebRTC: one `RTCPeerConnection` per person. When two sides offer at once
 * (after a reconnect), the one whose membership id sorts first gives way and answers instead.
 * What the others say is played through an audio element that belongs to no screen, so it is
 * heard while the call is minimised; the tiles show the picture, muted.
 */
@Injectable()
export class WebRtcPeerLinks implements PeerLinks {
  private readonly document = inject(DOCUMENT);
  private readonly signals = new Subject<{ to: string; signal: CallSignal }>();
  private readonly streams = new Subject<{ membershipId: string; stream: MediaStream }>();
  private readonly lost = new Subject<string>();
  private readonly links = new Map<string, Link>();
  private viewer = '';
  private local: MediaStream | null = null;
  private iceServers: RTCIceServer[] = [];

  readonly signal$ = this.signals.asObservable();
  readonly stream$ = this.streams.asObservable();
  readonly lost$ = this.lost.asObservable();

  open(viewerMembershipId: string, local: MediaStream, iceServers: IceServerView[]): void {
    this.close();
    this.viewer = viewerMembershipId;
    this.local = local;
    this.iceServers = iceServers.map((server) => ({
      urls: server.urls,
      username: server.username ?? undefined,
      credential: server.credential ?? undefined,
    }));
  }

  connect(membershipId: string): void {
    const link = this.links.get(membershipId) ?? this.link(membershipId);
    if (!link) return;
    void this.offer(membershipId, link);
  }

  receive(fromMembershipId: string, signal: CallSignal): void {
    void this.take(fromMembershipId, signal).catch(() => this.lost.next(fromMembershipId));
  }

  drop(membershipId: string): void {
    const link = this.links.get(membershipId);
    if (!link) return;
    this.links.delete(membershipId);
    link.peer.onicecandidate = null;
    link.peer.ontrack = null;
    link.peer.onconnectionstatechange = null;
    link.peer.close();
    if (link.audio) {
      link.audio.pause();
      link.audio.srcObject = null;
    }
  }

  close(): void {
    [...this.links.keys()].forEach((membershipId) => this.drop(membershipId));
    this.local = null;
  }

  private link(membershipId: string): Link | null {
    const view = this.document.defaultView;
    if (!view?.RTCPeerConnection || !this.local) return null;
    const peer = new view.RTCPeerConnection({ iceServers: this.iceServers });
    const link: Link = { peer, early: [], offering: false, audio: null, stream: null };
    this.links.set(membershipId, link);
    const local = this.local;
    local.getTracks().forEach((track) => peer.addTrack(track, local));

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) this.say(membershipId, 'candidate', candidate.toJSON());
    };
    peer.ontrack = ({ streams }) => {
      const stream = streams[0];
      if (!stream || link.stream === stream) return;
      link.stream = stream;
      link.audio ??= this.document.createElement('audio');
      link.audio.srcObject = stream;
      void link.audio.play().catch(() => undefined);
      this.streams.next({ membershipId, stream });
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' && this.links.get(membershipId) === link) {
        this.lost.next(membershipId);
      }
    };
    return link;
  }

  private async offer(membershipId: string, link: Link): Promise<void> {
    try {
      link.offering = true;
      await link.peer.setLocalDescription(await link.peer.createOffer());
      if (link.peer.localDescription) this.say(membershipId, 'offer', link.peer.localDescription);
    } catch {
      this.lost.next(membershipId);
    }
  }

  private async take(from: string, signal: CallSignal): Promise<void> {
    const payload: unknown = JSON.parse(signal.payload);
    if (signal.type === 'offer') {
      const held = this.links.get(from);
      // Both sides offered. The side that sorts first gives way; the other keeps its offer.
      if (held?.offering && this.viewer > from) return;
      // Otherwise an offer always begins the link anew: the other side began again.
      this.drop(from);
      const link = this.link(from);
      if (!link) return;
      await link.peer.setRemoteDescription(payload as RTCSessionDescriptionInit);
      await this.flush(link);
      await link.peer.setLocalDescription(await link.peer.createAnswer());
      if (link.peer.localDescription) this.say(from, 'answer', link.peer.localDescription);
      return;
    }
    const link = this.links.get(from);
    if (!link) return;
    if (signal.type === 'answer') {
      if (link.peer.signalingState !== 'have-local-offer') return;
      await link.peer.setRemoteDescription(payload as RTCSessionDescriptionInit);
      link.offering = false;
      await this.flush(link);
      return;
    }
    if (link.peer.remoteDescription)
      await link.peer.addIceCandidate(payload as RTCIceCandidateInit);
    else link.early.push(payload as RTCIceCandidateInit);
  }

  private async flush(link: Link): Promise<void> {
    for (const candidate of link.early.splice(0)) await link.peer.addIceCandidate(candidate);
  }

  private say(to: string, type: CallSignal['type'], payload: unknown): void {
    this.signals.next({ to, signal: { type, payload: JSON.stringify(payload) } });
  }
}
