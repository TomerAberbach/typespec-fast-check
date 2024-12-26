// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

export const Model1 = fc.record({
  a: fc.integer(),
});

export const Model2 = fc.record({
  b: fc.string(),
});

export const $Model = fc.record({
  property: fc
    .tuple(
      Model1,
      Model2,
    )
    .map(values => Object.assign(...values)),
});
