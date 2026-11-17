import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonListStorage } from './json-list-storage';

interface Note {
  id: string;
  text: string;
}

const KEY = 'popkin.test-list';

describe('JsonListStorage', () => {
  const list = () => new JsonListStorage<Note>(document, KEY);

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('loads nothing when the key was never written', () => {
    expect(list().load()).toEqual([]);
  });

  it('loads nothing from a value it cannot parse', () => {
    localStorage.setItem(KEY, 'not json');
    expect(list().load()).toEqual([]);
  });

  it('loads nothing from a value that is not a list', () => {
    localStorage.setItem(KEY, '{"id":"n1"}');
    expect(list().load()).toEqual([]);
  });

  it('gives back what it saved, under its own key', () => {
    const notes: Note[] = [
      { id: 'n1', text: 'Bring the tent' },
      { id: 'n2', text: 'Meet at noon' },
    ];

    list().save(notes);

    expect(new JsonListStorage<Note>(document, KEY).load()).toEqual(notes);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(notes));
  });

  it('removes the key once the list is empty', () => {
    list().save([{ id: 'n1', text: 'Bring the tent' }]);

    list().save([]);

    expect(localStorage.getItem(KEY)).toBeNull();
  });

  describe('without a usable store', () => {
    function documentWith(view: unknown): Document {
      return { defaultView: view } as unknown as Document;
    }

    const blocked = documentWith({
      get localStorage(): Storage {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
    const full = documentWith({
      localStorage: {
        getItem: () => '[{"id":"n1","text":"Bring the tent"}]',
        setItem: () => {
          throw new DOMException('Full', 'QuotaExceededError');
        },
        removeItem: () => {
          throw new DOMException('Closed', 'InvalidStateError');
        },
      },
    });

    it.each([
      ['no window', documentWith(null)],
      ['a store that refuses access', blocked],
    ])('loads nothing and saves nothing with %s', (_, doc) => {
      const storage = new JsonListStorage<Note>(doc, KEY);

      expect(storage.load()).toEqual([]);
      expect(() => storage.save([{ id: 'n1', text: 'Bring the tent' }])).not.toThrow();
      expect(() => storage.save([])).not.toThrow();
    });

    it('keeps quiet when a full or closed store refuses a write', () => {
      const storage = new JsonListStorage<Note>(full, KEY);

      expect(storage.load()).toEqual([{ id: 'n1', text: 'Bring the tent' }]);
      expect(() => storage.save([{ id: 'n2', text: 'Meet at noon' }])).not.toThrow();
      expect(() => storage.save([])).not.toThrow();
    });
  });
});
