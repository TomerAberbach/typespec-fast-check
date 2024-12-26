// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const Numeric = fc.double();

export const MinValueNumeric = fc.double({ min: -3.4e+39 });

export const MinValueExclusiveNumeric = fc.double({
  min: -3.4e+39,
  minExcluded: true,
});

export const MaxValueNumeric = fc.double({ max: 3.4e+39 });

export const MaxValueExclusiveNumeric = fc.double({
  max: 3.4e+39,
  maxExcluded: true,
});

export const MinMaxValueNumeric = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});

export const MinMaxValueExclusiveNumeric = fc.double({
  min: -3.4e+39,
  minExcluded: true,
  max: 3.4e+39,
  maxExcluded: true,
});

export const $Model = fc.record({
  a: fc.constant(1),
  b: fc.constant(2),
  c: fc.constantFrom(1, 2.2, -3),
});
