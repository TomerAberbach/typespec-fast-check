import * as fc from 'fast-check';

export const $Model = fc.record({
  a: fc.constant(1),
  b: fc.constant(2),
  c: fc.constantFrom(1, 2.2, -3),
});

export const Numeric = fc.double();

export const MinValueNumeric = fc.double({ min: -3.4e+39 });

export const MaxValueNumeric = fc.double({ max: 3.4e+39 });

export const MinMaxValueNumeric = fc.double({
  min: -3.4e+39,
  max: 3.4e+39,
});
