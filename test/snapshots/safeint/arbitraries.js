import * as fc from 'fast-check';

export const SafeInt = fc.maxSafeInteger();

export const MinValueSafeInt = fc.integer({
  min: -40000,
  max: 9007199254740991,
});

export const Min0ValueSafeInt = fc.maxSafeNat();

export const MaxValueSafeInt = fc.integer({
  min: -9007199254740991,
  max: 40000,
});

export const MinMaxValueSafeInt = fc.integer({
  min: -40000,
  max: 40000,
});

export const RedundantlyMinMaxValueSafeInt = fc.integer({
  min: -2147483650,
  max: 2147483650,
});
