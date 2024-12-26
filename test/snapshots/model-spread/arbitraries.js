// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const Model1 = fc.record({
  a: fc.integer(),
});

export const Model2 = fc.record({
  b: fc.string(),
});

export const $Model = fc
  .tuple(
    Model1,
    Model2,
    fc.dictionary(fc.string(), fc.boolean()),
    fc.record({
      c: fc.string(),
    }),
  )
  .map(values => Object.assign(...values));
