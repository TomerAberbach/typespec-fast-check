import * as fc from 'fast-check';

const string = fc.string();

export const Model2 = fc.record({
  b: string,
});

export const Model1 = fc.record({
  a: fc.integer(),
});

export const $Model = fc
  .tuple(
    Model1,
    Model2,
    fc.dictionary(string, fc.boolean()),
    fc.record({
      c: string,
    }),
  )
  .map(values => Object.assign(...values));