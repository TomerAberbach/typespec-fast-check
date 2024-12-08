import * as fc from 'fast-check';

export const Decimal128 = fc.double();

export const MinValueDecimal128 = fc.double({ min: -3.4e+39 });

export const MaxValueDecimal128 = fc.double({ max: 3.4e+39 });

export const MinMaxValueDecimal128 = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});
