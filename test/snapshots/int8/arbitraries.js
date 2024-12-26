import * as fc from "fast-check";

const int8 = fc.integer({
  min: -128,
  max: 127,
});

export const Int8 = int8;

export const MinValueInt8 = fc.integer({
  min: -10,
  max: 127,
});

export const MinValueExclusiveInt8 = fc.integer({
  min: -9,
  max: 127,
});

export const Min0ValueInt8 = fc.nat({ max: 127 });

export const MinNegative1ValueExclusiveInt8 = fc.nat({ max: 127 });

export const MaxValueInt8 = fc.integer({
  min: -128,
  max: 20,
});

export const MaxValueExclusiveInt8 = fc.integer({
  min: -128,
  max: 19,
});

export const MinMaxValueInt8 = fc.integer({
  min: -10,
  max: 20,
});

export const MinMaxValueExclusiveInt8 = fc.integer({
  min: -9,
  max: 19,
});

export const RedundantlyMinMaxValueInt8 = int8;

export const RedundantlyMinMaxValueExclusiveInt8 = int8;
