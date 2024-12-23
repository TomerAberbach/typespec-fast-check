import {
  getMaxItemsAsNumeric,
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMinItemsAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
} from '@typespec/compiler'
import type { Numeric, Program, Type } from '@typespec/compiler'
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
        minLength: getMinLengthAsNumeric(program, type),
        maxLength: getMaxLengthAsNumeric(program, type),
        minItems: getMinItemsAsNumeric(program, type),
        maxItems: getMaxItemsAsNumeric(program, type),
      }),
      filter(([, value]) => value !== undefined),
      reduce(toObject()),
    ),
  )

export type Constraints = {
  min?: Numeric
  max?: Numeric
  minLength?: Numeric
  maxLength?: Numeric
  minItems?: Numeric
  maxItems?: Numeric
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
  minLength,
  maxLength,
  minItems,
  maxItems,
}: Constraints): ConstraintsKey =>
  keyalesce([
    min?.asBigInt(),
    max?.asBigInt(),
    minLength?.asBigInt(),
    maxLength?.asBigInt(),
    minItems?.asBigInt(),
    maxItems?.asBigInt(),
  ])

const constraintsCache = new Map<ConstraintsKey, Constraints>()
type ConstraintsKey = ReturnType<typeof keyalesce>
