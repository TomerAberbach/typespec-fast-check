import * as fc from 'fast-check'

export const Float32 = fc.float();

export const MinValueFloat32 = fc.float({
  min: -3.14,
});

export const MaxValueFloat32 = fc.float({
  max: 3.14,
});

export const MinMaxValueFloat32 = fc.float({
  min: -3.14,
  max: 3.14,
});

export const RedundantlyMinMaxValueFloat32 = fc.float();