// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const $Model = fc.record({
  property1: fc.constant(null),
  property2: fc.option(fc.string()),
});
