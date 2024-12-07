import * as fc from 'fast-check'

export const Int8 = fc.integer({
  min: -128,
  max: 127,
});

export const MinValueInt8 = fc.integer({
  min: -10,
  max: 127,
});

export const MaxValueInt8 = fc.integer({
  min: -128,
  max: 20,
});

export const MinMaxValueInt8 = fc.integer({
  min: -10,
  max: 20,
});

export const RedundantlyMinMaxValueInt8 = fc.integer({
  min: -128,
  max: 127,
});