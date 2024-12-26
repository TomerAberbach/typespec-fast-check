import * as fc from "fast-check";

export const Model1 = fc
  .tuple(
    fc.record({
      property1: fc.integer(),
    }),
    fc.record({
      property2: fc.string(),
    }),
  )
  .map(values => Object.assign(...values));

export const Model2 = fc
  .tuple(
    fc.record({
      property1: fc.integer(),
    }),
    fc.record({
      property2: fc.string(),
    }),
  )
  .map(values => Object.assign(...values));
