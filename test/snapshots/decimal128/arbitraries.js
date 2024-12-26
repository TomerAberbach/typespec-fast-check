// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const Decimal128 = fc.double();

export const MinValueDecimal128 = fc.double({ min: -3.4e+39 });

export const MinValueExclusiveDecimal128 = fc.double({
  min: -3.4e+39,
  minExcluded: true,
});

export const MaxValueDecimal128 = fc.double({ max: 3.4e+39 });

export const MaxValueExclusiveDecimal128 = fc.double({
  max: 3.4e+39,
  maxExcluded: true,
});

export const MinMaxValueDecimal128 = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});

export const MinMaxValueExclusiveDecimal128 = fc.double({
  min: -3.4e+39,
  minExcluded: true,
  max: 3.4e+39,
  maxExcluded: true,
});
