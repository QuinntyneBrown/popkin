import { describe, expect, it } from 'vitest';
import { OutboxQueue } from './outbox-queue';

interface Note {
  id: string;
  text: string;
  state: 'Waiting' | 'Sending' | 'Failed';
  failure?: string;
  preview?: string;
}

function queueOf(stored: Note[] = []) {
  const saved: Note[][] = [];
  const queue = new OutboxQueue<Note>({
    storage: { load: () => stored, save: (entries) => saved.push(entries) },
    id: (note) => note.id,
    waiting: (note) => ({ ...note, state: 'Waiting', failure: undefined }),
    written: (note) => {
      const written = { ...note };
      delete written.preview;
      return written;
    },
  });
  return { queue, saved };
}

const note = (id: string, state: Note['state'] = 'Waiting'): Note => ({ id, text: id, state });

describe('OutboxQueue (L2-028 AC2, L2-123 AC4)', () => {
  it('starts with what was kept, in order', () => {
    const { queue } = queueOf([note('a'), note('b', 'Failed')]);

    expect(queue.entries().map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('puts what a reload found Sending back to Waiting, as it never got an answer', () => {
    const { queue } = queueOf([{ ...note('a', 'Sending'), failure: 'network' }]);

    expect(queue.entries()).toEqual([{ id: 'a', text: 'a', state: 'Waiting' }]);
  });

  it('keeps what is added at its end, and writes it down', () => {
    const { queue, saved } = queueOf([note('a')]);

    queue.add(note('b'));

    expect(queue.entries().map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(saved.at(-1)?.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('writes down only what means something after a reload', () => {
    const { queue, saved } = queueOf();

    queue.add({ ...note('a'), preview: 'blob:here' });

    expect(queue.find('a')?.preview).toBe('blob:here');
    expect(saved.at(-1)).toEqual([{ id: 'a', text: 'a', state: 'Waiting' }]);
  });

  it('changes one entry by its id', () => {
    const { queue } = queueOf([note('a'), note('b')]);

    queue.change('b', { state: 'Failed', failure: 'rejected' });

    expect(queue.find('b')).toMatchObject({ state: 'Failed', failure: 'rejected' });
    expect(queue.find('a')?.state).toBe('Waiting');
  });

  it('removes entries, and forgets their files', () => {
    const { queue, saved } = queueOf();
    const file = new File(['x'], 'x.jpg');
    queue.add(note('a'), file);
    queue.add(note('b'));

    expect(queue.file('a')).toBe(file);
    queue.remove((entry) => entry.id === 'a');

    expect(queue.entries().map((entry) => entry.id)).toEqual(['b']);
    expect(queue.file('a')).toBeUndefined();
    expect(saved.at(-1)?.map((entry) => entry.id)).toEqual(['b']);
  });

  it('holds a file in memory only, never writing it down', () => {
    const { queue, saved } = queueOf();

    queue.add(note('a'), new File(['x'], 'x.jpg'));

    expect(JSON.stringify(saved)).not.toContain('x.jpg');
  });

  it('forgets a file once it is uploaded, keeping the entry', () => {
    const { queue } = queueOf();
    queue.add(note('a'), new File(['x'], 'x.jpg'));

    queue.forgetFile('a');

    expect(queue.file('a')).toBeUndefined();
    expect(queue.find('a')).toBeDefined();
  });
});
