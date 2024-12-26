// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const $Model = fc.record({
  a: fc.record({
    a: fc.integer(),
    b: fc.integer(),
  }),
  b: fc.record({
    a: fc.constant(1),
    b: fc.constant(2),
  }),
});
