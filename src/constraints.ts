import {
  getEncode,
  getMaxItemsAsNumeric,
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMaxValueExclusiveAsNumeric,
  getMinItemsAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
  getMinValueExclusiveAsNumeric,
  getPattern,
} from '@typespec/compiler'
import type { EncodeData, Numeric, Program, Type } from '@typespec/compiler'
import keyalesce from 'keyalesce'
import { entries, filter, pipe, reduce, toObject } from 'lfi'

export const mergeConstraints = (
  constraints1: Constraints,
  constraints2: Constraints,
): Constraints => memoize({ ...constraints1, ...constraints2 })

export const getConstraints = (program: Program, type: Type): Constraints =>
  memoize(
    pipe(
      entries({
        min: getMinValueAsNumeric(program, type),
        max: getMaxValueAsNumeric(program, type),
        minExclusive: getMinValueExclusiveAsNumeric(program, type),
        maxExclusive: getMaxValueExclusiveAsNumeric(program, type),
        minLength: getMinLengthAsNumeric(program, type),
        maxLength: getMaxLengthAsNumeric(program, type),
        minItems: getMinItemsAsNumeric(program, type),
        maxItems: getMaxItemsAsNumeric(program, type),
        pattern: getPattern(program, type),
        encodeData:
          type.kind === `Scalar` || type.kind === `ModelProperty`
            ? getEncode(program, type)
            : undefined,
      }),
      filter(([, value]) => value !== undefined),
      reduce(toObject()),
    ) as Constraints,
  )

export type Constraints = {
  min?: Numeric
  max?: Numeric
  minExclusive?: Numeric
  maxExclusive?: Numeric
  minLength?: Numeric
  maxLength?: Numeric
  minItems?: Numeric
  maxItems?: Numeric
  pattern?: string
  encodeData?: EncodeData
}

const memoize = (constraints: Constraints): Constraints => {
  const constraintsKey = getConstraintsKey(constraints)
  let cachedArbitrary = constraintsCache.get(constraintsKey)
  if (!cachedArbitrary) {
    cachedArbitrary = constraints
    constraintsCache.set(constraintsKey, cachedArbitrary)
  }
  return cachedArbitrary
}

const getConstraintsKey = ({
  min,
  max,
  minExclusive,
  maxExclusive,
  minLength,
  maxLength,
  minItems,
  maxItems,
  pattern,
  encodeData,
}: Constraints): ConstraintsKey =>
  keyalesce([
    min?.asBigInt(),
    max?.asBigInt(),
    minExclusive?.asBigInt(),
    maxExclusive?.asBigInt(),
    minLength?.asBigInt(),
    maxLength?.asBigInt(),
    minItems?.asBigInt(),
    maxItems?.asBigInt(),
    pattern,
    encodeData?.encoding,
    encodeData?.type,
  ])

const constraintsCache = new Map<ConstraintsKey, Constraints>()
type ConstraintsKey = ReturnType<typeof keyalesce>
