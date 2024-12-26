// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

export const Float64 = fc.double();

export const MinValueFloat64 = fc.double({ min: -3.4e+39 });

export const MinValueExclusiveFloat64 = fc.double({
  min: -3.4e+39,
  minExcluded: true,
});

export const MaxValueFloat64 = fc.double({ max: 3.4e+39 });

export const MaxValueExclusiveFloat64 = fc.double({
  max: 3.4e+39,
  maxExcluded: true,
});

export const MinMaxValueFloat64 = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});

export const MinMaxValueExclusiveFloat64 = fc.double({
  min: -3.4e+39,
  minExcluded: true,
  max: 3.4e+39,
  maxExcluded: true,
});
