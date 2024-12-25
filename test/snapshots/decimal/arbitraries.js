import * as fc from 'fast-check';

export const Decimal = fc.double();

export const MinValueDecimal = fc.double({
  min: -3.4e+39,
});

export const MaxValueDecimal = fc.double({
  max: 3.4e+39,
});

export const MinMaxValueDecimal = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});
