import * as fc from 'fast-check'

export const Int64 = fc.bigInt({
  min: -9223372036854775808n,
  max: 9223372036854775807n,
});

export const MinValueInt64 = fc.bigInt({
  min: 2147483650n,
  max: 9223372036854775807n,
});

export const Min0ValueInt64 = fc.bigInt({
  min: 0n,
  max: 9223372036854775807n,
});

export const MaxValueInt64 = fc.bigInt({
  min: -9223372036854775808n,
  max: 2147483650n,
});

export const MinMaxValueInt64 = fc.bigInt({
  min: 2147483650n,
  max: 2147483650n,
});

export const RedundantlyMinMaxValueInt64 = fc.bigInt({
  min: 9223372036854775809n,
  max: 9223372036854775807n,
});