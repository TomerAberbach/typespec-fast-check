// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

export const SingleValueEnum = fc.constant("A");

export const NoSpecifiedValuesEnum = fc.constantFrom("A", "B", "C", "D");

export const StringEnum = fc.constantFrom("a", "b", "c", "d");

export const NumberEnum = fc.constantFrom(1, 2, 3.14, Infinity);
