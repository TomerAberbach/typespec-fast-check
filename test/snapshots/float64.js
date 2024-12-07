import * as fc from 'fast-check'

export const Float64 = fc.double();

export const MinValueFloat64 = fc.double({
  min: -3.4e+39,
});

export const MaxValueFloat64 = fc.double({
  max: 3.4e+39,
});

export const MinMaxValueFloat64 = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});