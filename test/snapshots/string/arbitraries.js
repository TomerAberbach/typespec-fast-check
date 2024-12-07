import * as fc from 'fast-check';

export const String = fc.string();

export const MinLengthString = fc.string({
  minLength: 1,
});

export const MaxLengthString = fc.string({
  maxLength: 5,
});

export const MinAndMaxLengthString = fc.string({
  minLength: 2,
  maxLength: 7,
});