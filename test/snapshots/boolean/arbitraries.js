import * as fc from "fast-check";

export const Boolean = fc.boolean();

export const $Model = fc.record({
  a: fc.constant(true),
  b: fc.constant(false),
  c: fc.boolean(),
  d: fc.boolean(),
});
