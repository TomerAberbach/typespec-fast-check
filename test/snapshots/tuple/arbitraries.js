// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

export const $Model = fc.record({
  property: fc.tuple(
    fc.string(),
    fc.integer(),
    fc.boolean(),
  ),
});
