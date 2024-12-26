// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const Decimal = fc.double();

export const MinValueDecimal = fc.double({ min: -3.4e+39 });

export const MinValueExclusiveDecimal = fc.double({
  min: -3.4e+39,
  minExcluded: true,
});

export const MaxValueDecimal = fc.double({ max: 3.4e+39 });

export const MaxValueExclusiveDecimal = fc.double({
  max: 3.4e+39,
  maxExcluded: true,
});

export const MinMaxValueDecimal = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});

export const MinMaxValueExclusiveDecimal = fc.double({
  min: -3.4e+39,
  minExcluded: true,
  max: 3.4e+39,
  maxExcluded: true,
});
