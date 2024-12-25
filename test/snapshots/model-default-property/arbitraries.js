import * as fc from "fast-check";

export const $Scalar = fc.integer();

export const $Enum = fc.constantFrom("A", "X");

export const DefaultPropertiesModel = fc.record(
  {
    a1: fc.constant(null),
    a2: fc.constant(null),
    b1: fc.boolean(),
    b2: fc.boolean(),
    c1: fc.oneof(
      fc.string(),
      fc.constant("abc"),
    ),
    c2: fc.oneof(
      fc.string(),
      fc.constant("abc"),
    ),
    d1: fc.oneof(
      fc.integer(),
      fc.constant(42),
    ),
    d2: fc.oneof(
      fc.integer(),
      fc.constant(42),
    ),
    e1: fc.oneof(
      fc.bigInt({
        min: -9223372036854775808n,
        max: 9223372036854775807n,
      }),
      fc.constant(42),
    ),
    e2: fc.oneof(
      fc.bigInt({
        min: -9223372036854775808n,
        max: 9223372036854775807n,
      }),
      fc.constant(42),
    ),
    f1: fc.oneof(
      $Scalar,
      fc.constant(42),
    ),
    f2: fc.oneof(
      $Scalar,
      fc.constant(42),
    ),
    g1: fc.oneof(
      $Enum,
      fc.constant("A"),
    ),
    g2: fc.oneof(
      $Enum,
      fc.constant("A"),
    ),
    h1: fc.oneof(
      $Enum,
      fc.constant("X"),
    ),
    h2: fc.oneof(
      $Enum,
      fc.constant("X"),
    ),
    i1: fc.oneof(
      fc.array(fc.string()),
      fc.constant([
        "a",
        "b"
      ]),
    ),
    i2: fc.oneof(
      fc.array(fc.string()),
      fc.constant([
        "a",
        "b"
      ]),
    ),
    j1: fc.oneof(
      fc.dictionary(fc.string(), fc.string()),
      fc.constant({
        a: "a",
        b: "b"
      }),
    ),
    j2: fc.oneof(
      fc.dictionary(fc.string(), fc.string()),
      fc.constant({
        a: "a",
        b: "b"
      }),
    ),
  },
  {
    withDeletedKeys: true,
  },
);
