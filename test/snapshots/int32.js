import * as fc from 'fast-check'

export const Int32 = fc.integer({
  min: -2147483648,
  max: 2147483647,
});

export const MinValueInt32 = fc.integer({
  min: -40000,
  max: 2147483647,
});

export const MaxValueInt32 = fc.integer({
  min: -2147483648,
  max: 40000,
});

export const MinMaxValueInt32 = fc.integer({
  min: -40000,
  max: 40000,
});

export const RedundantlyMinMaxValueInt32 = fc.integer({
  min: -2147483648,
  max: 2147483647,
});