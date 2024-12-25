import * as fc from "fast-check";

export const Model1 = fc.record({
  a: fc.integer(),
});

export const Model2 = Model1;

export const Model3 = fc
  .tuple(
    Model1,
    fc.record({
      b: fc.string(),
    }),
  )
  .map(values => Object.assign(...values));
