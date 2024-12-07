import * as fc from 'fast-check';

export const Float32 = fc.float();

export const MinValueFloat32 = fc.float({
  min: -3.140000104904175,
});

export const MinValue0Float32 = fc.float({
  min: 0,
});

export const MaxValueFloat32 = fc.float({
  max: 3.140000104904175,
});

export const MinMaxValueFloat32 = fc.float({
  min: -3.140000104904175,
  max: 3.140000104904175,
});

export const RedundantlyMinMaxValueFloat32 = fc.float();