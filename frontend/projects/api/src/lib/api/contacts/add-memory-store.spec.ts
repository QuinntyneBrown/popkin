import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryUploadEvent, PhotoMemoryView } from '../../models/contacts';
import { AddMemoryStore } from './add-memory-store';
import { CONTACTS_API } from './contacts-api';

const MB = 1024 * 1024;
const photo: PhotoMemoryView = {
  id: 'p1',
  caption: 'Lakeside, the canoe',
  day: '2026-07-18',
  thumbnailUrl: 't',
  photoUrl: 'p',
};

function fileOf(bytes: number, name = 'IMG_4471.jpg'): File {
  const file = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

describe('AddMemoryStore (L2-136, known gap 107 ruled)', () => {
  let store: AddMemoryStore;
  const api = { addPhotoMemory: vi.fn(), addFileMemory: vi.fn(), addNoteMemory: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AddMemoryStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(AddMemoryStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('refuses a photo over 25 MB as soon as it is chosen, and sends nothing (AC3)', () => {
    store.pick(fileOf(32 * MB));

    expect(store.problems()).toEqual([
      {
        fieldId: 'file',
        message: 'Photo: that one is 32 MB; choose one up to 25 MB.',
        error: 'That photo is 32 MB. A photo can be up to 25 MB.',
      },
    ]);
    expect(store.save('c1')).toBeNull();
    expect(api.addPhotoMemory).not.toHaveBeenCalled();
  });

  it('asks for a photo, and for words in a note', () => {
    expect(store.save('c1')).toBeNull();
    expect(store.problems().map((p) => p.error)).toEqual(['Choose a photo to add.']);

    store.choose('note');
    expect(store.save('c1')).toBeNull();
    expect(store.problems().map((p) => p.message)).toEqual(['Note: write the note.']);
  });

  it('reports how much is sent, then answers the photo kept (AC4)', () => {
    const uploads = new Subject<MemoryUploadEvent<PhotoMemoryView>>();
    api.addPhotoMemory.mockReturnValue(uploads);
    store.pick(fileOf(3.1 * MB));
    store.caption.set(' Lakeside, the canoe ');
    const kept = vi.fn();

    store.save('c1', '2026-07-18')!.subscribe(kept);
    uploads.next({ kind: 'progress', sent: 2.4 * MB, total: 3.1 * MB });

    expect(api.addPhotoMemory).toHaveBeenCalledWith(
      'c1',
      expect.any(String),
      store.file(),
      'Lakeside, the canoe',
      '2026-07-18',
    );
    expect(store.status()).toBe('Uploading · 2.4 of 3.1 MB');
    expect(store.percent()).toBe(77);
    expect(store.busy()).toBe(true);

    uploads.next({ kind: 'done', memory: photo });
    expect(kept).toHaveBeenCalledWith({ kind: 'photo', memory: photo });
    expect(store.busy()).toBe(false);
  });

  it('shows a refusal at its field', () => {
    api.addFileMemory.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { code: 'file_type_not_allowed' } }),
      ),
    );
    store.choose('file');
    store.pick(fileOf(10, 'setup.exe'));

    store.save('c1')!.subscribe({ error: () => undefined });

    expect(store.problems().map((p) => p.error)).toEqual([
      'Choose a PDF, a document, a spreadsheet or a picture.',
    ]);
    expect(store.state()).toBe('idle');
  });

  it('keeps everything after a failure, and sends again under the same id', () => {
    api.addNoteMemory
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of({ id: 'n1', text: 'Gift ideas', updatedOn: '2026-09-15' }));
    store.choose('note');
    store.note.set('Gift ideas');

    store.save('c1')!.subscribe({ error: () => undefined });
    expect(store.state()).toBe('failed');
    expect(store.note()).toBe('Gift ideas');
    store.save('c1')!.subscribe();

    const [first, second] = api.addNoteMemory.mock.calls;
    expect(second[1]).toBe(first[1]);
    expect(store.state()).toBe('idle');
  });
});
