import * as fc from 'fast-check';

export const Int64 = fc.bigInt({
  min: -9223372036854775808n,
  max: 9223372036854775807n,
});

export const MinValueInt64 = fc.bigInt({
  min: 2147483650n,
  max: 9223372036854775807n,
});

export const MaxValueInt64 = fc.bigInt({
  min: -9223372036854775808n,
  max: 2147483650n,
});
