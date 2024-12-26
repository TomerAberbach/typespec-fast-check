// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

const never = fc.constant(null).map(() => {
  throw new Error("never");
});

export const $Model = fc.record({
  property1: never,
  property2: never,
});
