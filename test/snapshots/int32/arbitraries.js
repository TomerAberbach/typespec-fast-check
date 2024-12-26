// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

export const Int32 = fc.integer();

export const MinValueInt32 = fc.integer({ min: -40000 });

export const MinValueExclusiveInt32 = fc.integer({ min: -39999 });

export const Min0ValueInt32 = fc.nat();

export const MinNegative1ValueExclusiveInt32 = fc.nat();

export const MaxValueInt32 = fc.integer({ max: 40000 });

export const MaxValueExclusiveInt32 = fc.integer({ max: 39999 });

export const MinMaxValueInt32 = fc.integer({
  min: -40000,
  max: 40000,
});

export const MinMaxValueExclusiveInt32 = fc.integer({
  min: -39999,
  max: 39999,
});

export const RedundantlyMinMaxValueInt32 = fc.integer();

export const RedundantlyMinMaxValueExclusiveInt32 = fc.integer();
