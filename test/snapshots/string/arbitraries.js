// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const String = fc.string();

export const MinLengthString = fc.string({ minLength: 1 });

export const MaxLengthString = fc.string({ maxLength: 5 });

export const MinAndMaxLengthString = fc.string({
  minLength: 2,
  maxLength: 7,
});

export const PatternString = fc.stringMatching(/^[a-z]+$/);

export const $Model = fc.record({
  a: fc.constant("string"),
  b: fc.constantFrom("string1", "string2"),
});
