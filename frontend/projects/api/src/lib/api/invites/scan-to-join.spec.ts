import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Observable, Subscriber } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QR_SCANNER, ScanEvent, ScannerProblem } from './qr-scanner';
import { ScanToJoin } from './scan-to-join';

describe('ScanToJoin', () => {
  let camera: Subscriber<ScanEvent> | null;
  let started: number;
  let stopped: number;
  let scan: ScanToJoin;
  const video = {} as HTMLVideoElement;

  const sees = (text: string) => camera?.next({ kind: 'text', text });
  const refuses = (problem: ScannerProblem) => camera?.error(problem);

  beforeEach(() => {
    camera = null;
    started = 0;
    stopped = 0;
    const start = () =>
      new Observable<ScanEvent>((subscriber) => {
        started++;
        camera = subscriber;
        return () => stopped++;
      });
    TestBed.configureTestingModule({
      providers: [
        ScanToJoin,
        { provide: QR_SCANNER, useValue: { start } },
        { provide: DOCUMENT, useValue: { location: { origin: 'https://popkin.community' } } },
      ],
    });
    scan = TestBed.inject(ScanToJoin);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('waits for the camera, then scans', () => {
    scan.start(video);
    expect(scan.state()).toBe('starting');
    camera?.next({ kind: 'started' });
    expect(scan.state()).toBe('scanning');
  });

  it('finds a Popkin invite, and stops the camera', () => {
    scan.start(video);
    camera?.next({ kind: 'started' });
    sees('https://popkin.community/i/kx7m2pqr9t');
    expect(scan.state()).toBe('found');
    expect(scan.code()).toBe('kx7m2pqr9t');
    expect(stopped).toBe(1);
  });

  it('says a code is not a Popkin’s and keeps scanning', () => {
    scan.start(video);
    camera?.next({ kind: 'started' });
    sees('https://example.com/menu');
    expect(scan.state()).toBe('invalid');
    expect(stopped).toBe(0);
    sees('kx7m2pqr9t');
    expect(scan.state()).toBe('found');
  });

  it.each<ScannerProblem>(['denied', 'no-camera', 'failed'])(
    'explains when the camera is %s',
    (problem) => {
      scan.start(video);
      refuses(problem);
      expect(scan.state()).toBe('denied');
    },
  );

  it('tries the camera again', () => {
    scan.start(video);
    refuses('denied');
    scan.retry();
    expect(started).toBe(2);
    expect(scan.state()).toBe('starting');
    camera?.next({ kind: 'started' });
    expect(scan.state()).toBe('scanning');
  });

  it('stops the camera when the dialog closes', () => {
    scan.start(video);
    camera?.next({ kind: 'started' });
    scan.stop();
    expect(stopped).toBe(1);
  });

  it('holds one camera at a time', () => {
    scan.start(video);
    scan.start(video);
    expect(started).toBe(2);
    expect(stopped).toBe(1);
  });
});
