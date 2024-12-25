import * as fc from "fast-check";

export const $Model = fc.record({
  a: fc.integer(),
  b: fc.string(),
});
