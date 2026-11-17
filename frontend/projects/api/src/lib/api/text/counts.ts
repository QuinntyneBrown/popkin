/** The word for `n` of a thing: `one` for exactly one, else `many` ("person", "people"). */
export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/** A count and its word: "1 person", "14 people", "0 ratings". */
export function counted(n: number, one: string, many = `${one}s`): string {
  return `${n} ${plural(n, one, many)}`;
}
