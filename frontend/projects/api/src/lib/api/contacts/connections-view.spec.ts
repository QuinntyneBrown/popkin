import { describe, expect, it } from 'vitest';
import { ContactCircle } from '../../models/contacts';
import { ConnectionsView, MapPersonView } from '../../models/connections';
import { connectNoResults, connectTitle, connectWhoSummary, lineToYou } from './connections-text';
import { mapLinks, panelRows, placeFaces } from './connections-view';

function person(
  id: string,
  name: string,
  circle: ContactCircle | null,
  knownAs: string | null = null,
): MapPersonView {
  return {
    contactId: id,
    firstName: name.split(' ')[0],
    fullName: name,
    initials: name
      .split(' ')
      .map((p) => p[0])
      .join(''),
    accent: 'Sky',
    photoUrl: null,
    knownAs,
    circle,
  };
}

const map: ConnectionsView = {
  people: [person('c', 'Chidi Okafor', 'Family', 'Brother'), person('t', 'Tomás Reyes', null)],
  connections: [
    {
      id: '1',
      contactId: 'c',
      otherContactId: 't',
      kind: 'Partner',
      words: 'Married',
      promised: false,
    },
  ],
};

describe('placeFaces', () => {
  it('spaces the faces evenly round the oval from the top, clockwise', () => {
    expect(placeFaces(['a', 'b', 'c', 'd'])).toEqual([
      { id: 'a', x: 0.5, y: 0.1 },
      { id: 'b', x: 0.9, y: 0.5 },
      { id: 'c', x: 0.5, y: 0.9 },
      { id: 'd', x: 0.1, y: 0.5 },
    ]);
  });

  it('puts twelve where the mocks draw them', () => {
    const faces = placeFaces(Array.from({ length: 12 }, (_, i) => String(i)));
    expect(faces[1]).toEqual({ id: '1', x: 0.7, y: 0.154 });
    expect(faces[9]).toEqual({ id: '9', x: 0.1, y: 0.5 });
  });
});

describe('lineToYou', () => {
  // Circle | The line to "You"
  it.each([
    ['Family', 'family'],
    ['Friends', 'friend'],
    ['Neighbours', 'friend'],
    ['Clubs', 'friend'],
    ['Work', 'work'],
    [null, null],
  ] as const)('%s draws %s', (circle, line) => {
    expect(lineToYou(circle)).toBe(line);
  });
});

describe('mapLinks', () => {
  it('draws "You" to each face with a circle, then each connection, a promised one dotted', () => {
    const promised = { ...map, connections: [{ ...map.connections[0], promised: true }] };
    expect(mapLinks(promised)).toEqual([
      { a: 'you', b: 'c', kind: 'family' },
      { a: 'c', b: 't', kind: 'partner', pending: true },
    ]);
  });
});

describe('panelRows', () => {
  const you = { photoUrl: '/me.jpg', accent: 'coral' };

  it('lists "You" by how the person knows them, then each connection in its words', () => {
    expect(panelRows(map, map.people[0], you).map((r) => [r.name, r.meta, r.kind])).toEqual([
      ['You', 'Brother', 'family'],
      ['Tomás Reyes', 'Married', 'partner'],
    ]);
  });

  it('leaves "You" out for a face with no circle, and names the kind without words', () => {
    const plain = { ...map, connections: [{ ...map.connections[0], words: null }] };
    expect(panelRows(plain, plain.people[1], you).map((r) => [r.name, r.meta])).toEqual([
      ['Chidi Okafor', 'Partner'],
    ]);
  });
});

describe('Connect’s words', () => {
  it('names the contact, or asks for two people from the empty map', () => {
    expect(connectTitle('Chidi')).toBe('Connect Chidi to…');
    expect(connectTitle(null)).toBe('Connect two people');
    expect(connectWhoSummary('Chidi')).toBe('Who: pick who Chidi is connected to.');
  });

  it('says a search matched nobody, and offers to add them', () => {
    expect(connectNoResults('Femi', 'Chidi')).toEqual({
      heading: 'No one called “Femi” in your contacts',
      text: 'Add them first, then connect them to Chidi.',
      add: 'Add “Femi”',
    });
  });
});
