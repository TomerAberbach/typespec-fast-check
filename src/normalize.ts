import { all, first, get, map, pipe, reduce, toArray, toMap, unique } from 'lfi'
import {
  arrayArbitrary,
  booleanArbitrary,
  constantArbitrary,
  dictionaryArbitrary,
  enumArbitrary,
  intersectionArbitrary,
  neverArbitrary,
  recordArbitrary,
  referenceArbitrary,
  unionArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  ArrayArbitrary,
  ConstantArbitrary,
  DictionaryArbitrary,
  IntersectionArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  UnionArbitrary,
} from './arbitrary.ts'

const normalizeArbitrary = (arbitrary: Arbitrary): Arbitrary => {
  switch (arbitrary.type) {
    case `never`:
    case `anything`:
    case `constant`:
    case `boolean`:
    case `number`:
    case `bigint`:
    case `string`:
    case `url`:
    case `bytes`:
    case `enum`:
      return arbitrary
    case `array`:
      return normalizeArrayArbitrary(arbitrary)
    case `dictionary`:
      return normalizeDictionaryArbitrary(arbitrary)
    case `union`:
      return normalizeUnionArbitrary(arbitrary)
    case `record`:
      return normalizeRecordArbitrary(arbitrary)
    case `intersection`:
      return normalizeIntersectionArbitrary(arbitrary)
    case `reference`:
      return normalizeReferenceArbitrary(arbitrary)
  }
}

const normalizeArrayArbitrary = ({
  value,
  ...options
}: ArrayArbitrary): Arbitrary =>
  arrayArbitrary(normalizeArbitrary(value), options)

const normalizeDictionaryArbitrary = ({
  key,
  value,
}: DictionaryArbitrary): Arbitrary =>
  dictionaryArbitrary(normalizeArbitrary(key), normalizeArbitrary(value))

const normalizeUnionArbitrary = (arbitrary: UnionArbitrary): Arbitrary => {
  const variants = new Set(arbitrary.variants.map(normalizeArbitrary))

  const falseConstant = constantArbitrary(false)
  const trueConstant = constantArbitrary(true)
  if (variants.has(falseConstant) && variants.has(trueConstant)) {
    variants.add(booleanArbitrary())
  }
  if (variants.has(booleanArbitrary())) {
    // The set of possible boolean values is so small that there's no point in
    // biasing a union towards `true` or `false`.
    variants.delete(falseConstant)
    variants.delete(trueConstant)
  }

  switch (variants.size) {
    case 0:
      return neverArbitrary()
    case 1:
      return get(first(variants))
    default:
      return all(variant => variant.type === `constant`, variants)
        ? enumArbitrary(
            pipe(
              variants,
              map(variant => (variant as ConstantArbitrary).value),
              reduce(toArray()),
            ),
          )
        : unionArbitrary([...variants])
  }
}

const normalizeRecordArbitrary = ({ properties }: RecordArbitrary): Arbitrary =>
  recordArbitrary(
    pipe(
      properties,
      map(([key, property]) => [
        key,
        { ...property, arbitrary: normalizeArbitrary(property.arbitrary) },
      ]),
      reduce(toMap()),
    ),
  )

const normalizeIntersectionArbitrary = (
  arbitrary: IntersectionArbitrary,
): Arbitrary => {
  const arbitraries = [...unique(arbitrary.arbitraries.map(normalizeArbitrary))]
  switch (arbitraries.length) {
    case 0:
      return recordArbitrary(new Map())
    case 1:
      return arbitraries[0]!
    default:
      return intersectionArbitrary(arbitraries)
  }
}

const normalizeReferenceArbitrary = ({
  name,
  arbitrary,
}: ReferenceArbitrary): Arbitrary =>
  referenceArbitrary(name, normalizeArbitrary(arbitrary))

export default normalizeArbitrary
