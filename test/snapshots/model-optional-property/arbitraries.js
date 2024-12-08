import * as fc from 'fast-check';

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
    c: fc.bigInt({
      min: -9223372036854775808n,
      max: 9223372036854775807n,
    }),
  },
  { withDeletedKeys: true },
);

export const SomeOptionalModel = fc.record(
  {
    a: fc.integer(),
    b: fc.string(),
    c: fc.bigInt({
      min: -9223372036854775808n,
      max: 9223372036854775807n,
    }),
  },
  { requiredKeys: ['b'] },
);
