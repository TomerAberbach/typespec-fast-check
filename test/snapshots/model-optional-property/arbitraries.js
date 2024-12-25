import * as fc from "fast-check";

const int64 = fc.bigInt({
  min: -9223372036854775808n,
  max: 9223372036854775807n,
});

export const EmptyModel = fc.record({});

export const AllRequiredModel = fc.record({
  a: fc.integer(),
  b: fc.string(),
  c: fc.string(),
});

export const AllOptionalModel = fc.record(
  {
    a: fc.integer(),
    b: fc.string(),
    c: int64,
  },
  { withDeletedKeys: true },
);

export const SomeOptionalModel = fc.record(
  {
    a: fc.integer(),
    b: fc.string(),
    c: int64,
  },
  {
    requiredKeys: ["b"],
  },
);
