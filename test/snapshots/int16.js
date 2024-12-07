import * as fc from 'fast-check'

export const Int16 = fc.integer({
  min: -32768,
  max: 32767,
});

export const MinValueInt16 = fc.integer({
  min: -200,
  max: 32767,
});

export const MaxValueInt16 = fc.integer({
  min: -32768,
  max: 345,
});

export const MinMaxValueInt16 = fc.integer({
  min: -200,
  max: 345,
});

export const RedundantlyMinMaxValueInt16 = fc.integer({
  min: -32768,
  max: 32767,
});