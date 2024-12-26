// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const SimpleUnion = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
);

export const UnionOfTypeAndConstant = fc.oneof(
  fc.string(),
  fc.constant("a"),
);

export const UnionOfTypeAndConstants = fc.oneof(
  fc.string(),
  fc.constantFrom("a", "b", "c"),
);

export const NestedUnions = fc.oneof(
  fc.string(),
  fc.boolean(),
  fc.integer(),
  fc.option(fc.constantFrom("a", "b")),
  fc.constant("c"),
);
