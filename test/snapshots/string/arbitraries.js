import * as fc from 'fast-check';

export const $Model = fc.record({
  a: fc.constant("string"),
  b: fc.oneof(
    fc.constant("string1"),
    fc.constant("string2"),
  ),
});

export const String = fc.string();

export const MinLengthString = fc.string({ minLength: 1 });

export const MaxLengthString = fc.string({ maxLength: 5 });

export const MinAndMaxLengthString = fc.string({
  minLength: 2,
  maxLength: 7,
});
