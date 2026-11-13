import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PhotoSummaryView, PhotoUploadEvent } from '../../models/photos';
import { PhotoUploads } from './photo-uploads';
import { PHOTOS_API } from './photos-api';

const MB = 1024 * 1024;
const file = (name: string, size = MB, type = 'image/jpeg') =>
  ({ name, size, type }) as unknown as File;
const done = (id: string): PhotoUploadEvent => ({
  kind: 'done',
  photo: { id } as PhotoSummaryView,
});
const refused = (status: number, code?: string) =>
  new HttpErrorResponse({ status, error: code ? { code } : null });

/** Holds each upload open until the test says how it ends. */
class Fake {
  readonly sent: { name: string; caption: string; run: Subject<PhotoUploadEvent> }[] = [];

  upload = (_: string, sending: File, caption: string): Observable<PhotoUploadEvent> => {
    const run = new Subject<PhotoUploadEvent>();
    this.sent.push({ name: sending.name, caption, run });
    return run;
  };

  finish(index: number): void {
    this.sent[index].run.next(done(`photo-${index}`));
    this.sent[index].run.complete();
  }

  fail(index: number, error = refused(500)): void {
    this.sent[index].run.error(error);
  }
}

describe('PhotoUploads', () => {
  let api: Fake;
  let uploads: PhotoUploads;
  const states = () => uploads.items().map((item) => item.state);

  beforeEach(() => {
    api = new Fake();
    TestBed.configureTestingModule({
      providers: [PhotoUploads, { provide: PHOTOS_API, useValue: api }],
    });
    uploads = TestBed.inject(PhotoUploads);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('choosing', () => {
    // L2-031 AC1
    it('lists the photos with an action that counts them', () => {
      uploads.choose('p', [file('a.jpg'), file('b.jpg'), file('c.jpg')]);
      expect(uploads.phase()).toBe('choosing');
      expect(states()).toEqual(['ready', 'ready', 'ready']);
      expect(uploads.items().map((item) => item.label)).toEqual([
        'Caption for photo 1',
        'Caption for photo 2',
        'Caption for photo 3',
      ]);
      expect(uploads.action()).toEqual({ label: 'Add 3 photos', disabled: false });
    });

    // L2-031 AC2
    it('marks a photo that cannot be added with the reason and does not count it', () => {
      uploads.choose('p', [file('a.jpg'), file('big.jpg', 14 * MB), file('c.jpg')]);
      expect(states()).toEqual(['ready', 'invalid', 'ready']);
      expect(uploads.items()[1].problem).toBe('This file is 14 MB. Photos can be up to 10 MB.');
      expect(uploads.action()).toEqual({ label: 'Add 2 photos', disabled: false });
    });

    it('has nothing to add when no photo can be', () => {
      uploads.choose('p', [file('clip.mov', MB, 'video/quicktime')]);
      expect(uploads.action()).toEqual({ label: 'Add photos', disabled: true });
    });

    it('takes the first twenty and says so', () => {
      uploads.choose(
        'p',
        Array.from({ length: 22 }, (_, i) => file(`${i}.jpg`)),
      );
      expect(uploads.items()).toHaveLength(20);
      expect(uploads.notice()).toBe(
        'You can add 20 photos at a time. The first 20 are here; add the other 2 next.',
      );
    });

    // L2-031 AC3
    it('accepts no more than 200 characters of caption and counts near the limit', () => {
      uploads.choose('p', [file('a.jpg')]);
      const [item] = uploads.items();
      uploads.caption(item.id, 'x'.repeat(230));
      expect(uploads.items()[0].caption).toHaveLength(200);
      expect(uploads.items()[0].count).toBe('200 / 200');

      uploads.caption(item.id, 'Dock');
      expect(uploads.items()[0].count).toBeNull();
    });
  });

  describe('adding', () => {
    beforeEach(() => {
      uploads.choose('p', [file('a.jpg'), file('big.jpg', 14 * MB), file('c.jpg')]);
      uploads.caption(uploads.items()[0].id, '  First light  ');
    });

    // L2-031 AC2, AC4
    it('sends the photos one at a time, skipping the one marked', () => {
      uploads.add();
      expect(uploads.phase()).toBe('uploading');
      expect(api.sent.map((s) => [s.name, s.caption])).toEqual([['a.jpg', 'First light']]);
      expect(states()).toEqual(['uploading', 'invalid', 'waiting']);
      expect(uploads.action()).toEqual({ label: 'Adding…', disabled: true });

      api.finish(0);
      expect(api.sent.map((s) => s.name)).toEqual(['a.jpg', 'c.jpg']);
      expect(states()).toEqual(['done', 'invalid', 'uploading']);
    });

    // L2-031 AC4
    it('says how far the upload is', () => {
      uploads.add();
      expect(uploads.progress()).toEqual({ label: 'Uploading 1 of 2', fraction: 0 });

      api.sent[0].run.next({ kind: 'progress', fraction: 0.5 });
      expect(uploads.progress()).toEqual({ label: 'Uploading 1 of 2', fraction: 0.25 });

      api.finish(0);
      expect(uploads.progress()).toEqual({ label: 'Uploading 2 of 2', fraction: 0.5 });
    });

    it('does not start twice', () => {
      uploads.add();
      uploads.add();
      expect(api.sent).toHaveLength(1);
    });

    it('does not let a caption change once it is on its way', () => {
      uploads.add();
      uploads.caption(uploads.items()[0].id, 'Changed');
      expect(uploads.items()[0].caption).toBe('  First light  ');
    });

    it('is finished when every photo went up', () => {
      uploads.add();
      api.finish(0);
      api.finish(1);
      expect(uploads.phase()).toBe('finished');
      expect(uploads.added().map((p) => p.id)).toEqual(['photo-0', 'photo-1']);
      expect(uploads.outcome()).toBeNull();
      expect(uploads.progress()).toBeNull();
    });

    // L2-031 AC5
    it('keeps a photo that failed with Try again, and goes on with the rest', () => {
      uploads.add();
      api.fail(0);
      expect(states()).toEqual(['failed', 'invalid', 'uploading']);

      api.finish(1);
      expect(uploads.phase()).toBe('finished');
      expect(uploads.items()[0].problem).toBe('Didn’t upload.');
      expect(uploads.outcome()).toBe('One photo didn’t upload. The other one is in the album.');
      expect(uploads.action()).toEqual({ label: 'Done', disabled: false });
    });

    // L2-031 AC5
    it('tries a failed photo again on its own', () => {
      uploads.add();
      api.fail(0);
      api.finish(1);

      uploads.retry(uploads.items()[0].id);
      expect(uploads.phase()).toBe('uploading');
      expect(states()).toEqual(['uploading', 'invalid', 'done']);
      expect(uploads.progress()?.label).toBe('Uploading 1 of 1');

      api.finish(2);
      expect(uploads.phase()).toBe('finished');
      expect(uploads.outcome()).toBeNull();
      expect(uploads.added()).toHaveLength(2);
    });

    it.each([
      [
        'photo_type_not_allowed',
        'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.',
      ],
      ['photo_too_large', 'This file is too large. Photos can be up to 10 MB.'],
    ])('marks a photo the server refuses as %s, with no Try again', (code, problem) => {
      uploads.add();
      api.fail(0, refused(400, code));
      expect(uploads.items()[0]).toMatchObject({ state: 'invalid', problem });
      expect(states()[2]).toBe('uploading');
    });

    // L2-045 AC2
    it('stops when the Popkin has wrapped up', () => {
      uploads.add();
      api.fail(0, refused(409, 'popkin_wrapped_up'));
      expect(uploads.phase()).toBe('finished');
      expect(api.sent).toHaveLength(1);
      expect(states()).toEqual(['failed', 'invalid', 'failed']);
      expect(uploads.outcome()).toBe('This Popkin has wrapped up, so photos can’t be added.');
    });
  });
});
