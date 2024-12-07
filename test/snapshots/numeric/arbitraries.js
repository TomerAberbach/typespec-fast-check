import * as fc from 'fast-check';

export const Numeric = fc.double();

export const MinValueNumeric = fc.double({
  min: -3.4e+39,
});

export const MaxValueNumeric = fc.double({
  max: 3.4e+39,
});

export const MinMaxValueNumeric = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});