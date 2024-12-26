import * as fc from "fast-check";

export const SafeInt = fc.maxSafeInteger();

export const MinValueSafeInt = fc.integer({
  min: -40000,
  max: 9007199254740991,
});

export const MinValueExclusiveSafeInt = fc.integer({
  min: -39999,
  max: 9007199254740991,
});

export const Min0ValueSafeInt = fc.maxSafeNat();

export const MinNegative1ValueExclusiveSafeInt = fc.maxSafeNat();

export const MaxValueSafeInt = fc.integer({
  min: -9007199254740991,
  max: 40000,
});

export const MaxValueExclusiveSafeInt = fc.integer({
  min: -9007199254740991,
  max: 39999,
});

export const MinMaxValueSafeInt = fc.integer({
  min: -40000,
  max: 40000,
});

export const MinMaxValueExclusiveSafeInt = fc.integer({
  min: -39999,
  max: 39999,
});

export const RedundantlyMinMaxValueSafeInt = fc.integer({
  min: -2147483650,
  max: 2147483650,
});

export const RedundantlyMinMaxValueExclusiveSafeInt = fc.integer({
  min: -2147483649,
  max: 2147483649,
});
