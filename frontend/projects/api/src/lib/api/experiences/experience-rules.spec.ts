import { describe, expect, it } from 'vitest';
import { commentProblem, draftProblems, fixSummary, refusedField } from './experience-rules';

const draft = (extra: Partial<Parameters<typeof draftProblems>[0]> = {}) => ({
  title: 'Bonfire songs on the beach',
  place: '',
  when: '',
  picture: null,
  ...extra,
});
const file = (name: string, type: string, size: number) => ({ name, type, size });

describe('draftProblems', () => {
  it('finds nothing wrong with a title alone', () => {
    expect(draftProblems(draft())).toEqual({});
  });

  it.each([
    ['', 'Give it a name.'],
    ['   ', 'Give it a name.'],
    ['x'.repeat(81), 'Keep the title to 80 characters.'],
  ])('refuses the title %j', (title, problem) =>
    expect(draftProblems(draft({ title }))).toEqual({ title: problem }),
  );

  it('takes a title of exactly 80 characters, counted after trimming', () => {
    expect(draftProblems(draft({ title: ` ${'x'.repeat(80)} ` }))).toEqual({});
  });

  it('refuses a place over 80 characters', () => {
    expect(draftProblems(draft({ place: 'x'.repeat(81) }))).toEqual({
      place: 'Keep the place to 80 characters.',
    });
  });

  it('refuses a when over 40 characters', () => {
    expect(draftProblems(draft({ when: 'x'.repeat(41) }))).toEqual({
      when: 'Keep this to 40 characters.',
    });
  });

  it.each([
    [
      file('notes.pdf', 'application/pdf', 1000),
      'That file isn’t a photo we can use. Choose a JPEG, PNG, WebP or HEIC.',
    ],
    [
      file('big.jpg', 'image/jpeg', 11 * 1024 * 1024),
      'That photo is over 10 MB. Choose a smaller one.',
    ],
  ])('refuses the picture %j', (picture, problem) =>
    expect(draftProblems(draft({ picture }))).toEqual({ picture: problem }),
  );

  it('takes a picture within the limits of a photo', () => {
    expect(draftProblems(draft({ picture: file('lake.jpg', 'image/jpeg', 2_000_000) }))).toEqual(
      {},
    );
  });

  it('names every field that is wrong', () => {
    expect(Object.keys(draftProblems(draft({ title: '', place: 'x'.repeat(81) })))).toEqual([
      'title',
      'place',
    ]);
  });
});

describe('fixSummary', () => {
  it('is nothing when nothing is wrong', () => {
    expect(fixSummary({})).toBeNull();
  });

  it('lists one thing', () => {
    expect(fixSummary({ title: 'Give it a name.' })).toEqual({
      heading: 'One thing to fix',
      items: [{ field: 'title', text: 'Title: give it a name.' }],
    });
  });

  it('counts several, in the order of the form', () => {
    expect(
      fixSummary({ place: 'Keep the place to 80 characters.', title: 'Give it a name.' }),
    ).toEqual({
      heading: '2 things to fix',
      items: [
        { field: 'title', text: 'Title: give it a name.' },
        { field: 'place', text: 'Place: keep the place to 80 characters.' },
      ],
    });
  });
});

describe('refusedField', () => {
  it.each([
    ['title_required', { title: 'Give it a name.' }],
    ['title_too_long', { title: 'Keep the title to 80 characters.' }],
    ['place_too_long', { place: 'Keep the place to 80 characters.' }],
    ['when_too_long', { when: 'Keep this to 40 characters.' }],
    [
      'picture_type_not_allowed',
      { picture: 'That file isn’t a photo we can use. Choose a JPEG, PNG, WebP or HEIC.' },
    ],
    ['picture_too_large', { picture: 'That photo is over 10 MB. Choose a smaller one.' }],
  ])('the refusal %s marks its field', (code, problems) =>
    expect(refusedField(code)).toEqual(problems),
  );

  it.each(['invalid_kind', 'popkin_wrapped_up', undefined])(
    'the refusal %s marks no field',
    (code) => expect(refusedField(code)).toBeNull(),
  );
});

describe('commentProblem', () => {
  const blank = 'Write a few words, or close this to keep just your stars.';
  it.each([
    ['', blank],
    ['  \n ', blank],
    ['x'.repeat(501), 'Keep your comment to 500 characters.'],
    ['Would do it every morning if I could.', null],
    [` ${'x'.repeat(500)} `, null],
  ])('the comment %j has the problem %j', (text, problem) =>
    expect(commentProblem(text)).toBe(problem),
  );

  it.each([
    ['comment_required', blank],
    ['comment_too_long', 'Keep your comment to 500 characters.'],
    ['rating_required', null],
  ])('the refusal %s reads %j', (code, problem) =>
    expect(commentProblem('fine', code)).toBe(problem),
  );
});
