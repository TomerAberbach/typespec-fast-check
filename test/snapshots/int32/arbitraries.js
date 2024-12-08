import * as fc from 'fast-check';

const int32 = fc.integer();

export const Int32 = int32;

export const MinValueInt32 = fc.integer({
  min: -40000,
});

export const Min0ValueInt32 = fc.nat();

export const MaxValueInt32 = fc.integer({
  max: 40000,
});

export const MinMaxValueInt32 = fc.integer({
  min: -40000,
  max: 40000,
});

export const RedundantlyMinMaxValueInt32 = int32;