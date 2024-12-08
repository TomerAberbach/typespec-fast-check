import * as fc from 'fast-check';

const string = fc.string();

export const $Model = fc
  .tuple(
    fc.record({
      a: fc.integer(),
      b: string,
    }),
    fc.dictionary(string, fc.boolean()),
  )
  .map(values => Object.assign(...values));
