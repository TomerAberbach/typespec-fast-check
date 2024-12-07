export const numerics = {
  int8: { min: -128, max: 127, isInteger: true },
  int16: { min: -32_768, max: 32_767, isInteger: true },
  int32: { min: -2_147_483_648, max: 2_147_483_647, isInteger: true },
  int64: {
    min: -9_223_372_036_854_775_808n,
    max: 9_223_372_036_854_775_807n,
    isInteger: true,
  },
  uint8: { min: 0, max: 255, isInteger: true },
  uint16: { min: 0, max: 65_535, isInteger: true },
  uint32: { min: 0, max: 4_294_967_295, isInteger: true },
  uint64: { min: 0, max: 18_446_744_073_709_551_615n, isInteger: true },
  safeint: {
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
    isInteger: true,
  },
  float32: { min: -3.4e38, max: 3.4e38, isInteger: false },
  float64: { min: -Number.MAX_VALUE, max: Number.MAX_VALUE, isInteger: false },
} as const satisfies Record<
  string,
  {
    min: number | bigint
    max: number | bigint
    isInteger: boolean
  }
>

const constFastCheckNumerics = {
  // https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/#integer
  integer: {
    min: { value: numerics.int32.min, configurable: true },
    max: { value: numerics.int32.max, configurable: true },
    isInteger: true,
  },
  // https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/#nat
  nat: {
    min: { value: 0, configurable: false },
    max: { value: numerics.int32.max, configurable: true },
    isInteger: true,
  },
  // https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/#maxsafeinteger
  maxSafeInteger: {
    min: { value: numerics.safeint.min, configurable: false },
    max: { value: numerics.safeint.max, configurable: false },
    isInteger: true,
  },
  // https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/#maxsafenat
  maxSafeNat: {
    min: { value: 0, configurable: false },
    max: { value: numerics.safeint.max, configurable: false },
    isInteger: true,
  },
  // https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/#float
  float: {
    min: {
      value: numerics.float32.min,
      configurable: `higher`,
      normalize: Math.fround,
    },
    max: {
      value: numerics.float32.max,
      configurable: `lower`,
      normalize: Math.fround,
    },
    isInteger: false,
  },
  // https://fast-check.dev/docs/core-blocks/arbitraries/primitives/number/#double
  double: {
    min: { value: numerics.float64.min, configurable: `higher` },
    max: { value: numerics.float64.max, configurable: `lower` },
    isInteger: false,
  },
} as const satisfies Record<string, FastCheckNumeric>

export const fastCheckNumerics: Record<
  keyof typeof constFastCheckNumerics,
  FastCheckNumeric
> = constFastCheckNumerics

type FastCheckNumeric = {
  min: {
    value: number
    configurable: boolean | `higher`
    normalize?: (number: number) => number
  }
  max: {
    value: number
    configurable: boolean | `lower`
    normalize?: (number: number) => number
  }
  isInteger: boolean
}
