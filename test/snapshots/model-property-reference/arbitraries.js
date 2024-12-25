import * as fc from "fast-check";

export const Model1 = fc.record({
  property: fc.string(),
});

export const Model2 = fc.record({
  property: fc.string(),
});
