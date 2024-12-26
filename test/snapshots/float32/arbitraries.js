// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const Float32 = fc.float();

export const MinValueFloat32 = fc.float({ min: -3.140000104904175 });

export const MinValueExclusiveFloat32 = fc.float({
  min: -3.140000104904175,
  minExcluded: true,
});

export const Min0ValueFloat32 = fc.float({ min: 0 });

export const Min0ValueExclusiveFloat32 = fc.float({
  min: 0,
  minExcluded: true,
});

export const MaxValueFloat32 = fc.float({ max: 3.140000104904175 });

export const MaxValueExclusiveFloat32 = fc.float({
  max: 3.140000104904175,
  maxExcluded: true,
});

export const MinMaxValueFloat32 = fc.float({
  min: -3.140000104904175,
  max: 3.140000104904175,
});

export const MinMaxValueExclusiveFloat32 = fc.float({
  min: -3.140000104904175,
  minExcluded: true,
  max: 3.140000104904175,
  maxExcluded: true,
});

export const RedundantlyMinMaxValueFloat32 = fc.float();

export const RedundantlyMinMaxValueExclusiveFloat32 = fc.float();
