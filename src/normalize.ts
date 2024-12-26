import {
  concat,
  first,
  flatMap,
  get,
  map,
  pipe,
  reduce,
  toMap,
  toSet,
} from 'lfi'
import { SameValueSet } from 'svkc'
import {
  arrayArbitrary,
  booleanArbitrary,
  constantArbitrary,
  dictionaryArbitrary,
  enumArbitrary,
  functionCallArbitrary,
  functionDeclarationArbitrary,
  intersectionArbitrary,
  neverArbitrary,
  optionArbitrary,
  recordArbitrary,
  referenceArbitrary,
  tupleArbitrary,
  unionArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  ArrayArbitrary,
  DictionaryArbitrary,
  EnumArbitrary,
  FunctionCallArbitrary,
  FunctionDeclarationArbitrary,
  IntersectionArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  TupleArbitrary,
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
    case `option`:
    case `recursive-reference`:
    case `parameter-reference`:
      return arbitrary
    case `enum`:
      return normalizeEnumArbitrary(arbitrary)
    case `array`:
      return normalizeArrayArbitrary(arbitrary)
    case `tuple`:
      return normalizeTupleArbitrary(arbitrary)
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
    case `function-declaration`:
      return normalizeFunctionDeclarationArbitrary(arbitrary)
    case `function-call`:
      return normalizeFunctionCallArbitrary(arbitrary)
  }
}

const normalizeEnumArbitrary = (arbitrary: EnumArbitrary): Arbitrary => {
  const members = new SameValueSet(arbitrary.members)

  switch (members.size) {
    case 0:
      return neverArbitrary()
    case 1:
      return constantArbitrary(get(first(members)))
    default:
      if (!members.has(null)) {
        return enumArbitrary([...members])
      }
      members.delete(null)
      return optionArbitrary(normalizeArbitrary(enumArbitrary([...members])))
  }
}

const normalizeArrayArbitrary = ({
  value,
  ...options
}: ArrayArbitrary): Arbitrary =>
  arrayArbitrary(normalizeArbitrary(value), options)

const normalizeTupleArbitrary = ({ arbitraries }: TupleArbitrary): Arbitrary =>
  tupleArbitrary(arbitraries.map(normalizeArbitrary))

const normalizeDictionaryArbitrary = ({
  key,
  value,
}: DictionaryArbitrary): Arbitrary =>
  dictionaryArbitrary(normalizeArbitrary(key), normalizeArbitrary(value))

const normalizeUnionArbitrary = (arbitrary: UnionArbitrary): Arbitrary => {
  const variants = new Set<Arbitrary>(
    pipe(
      arbitrary.variants,
      map(normalizeArbitrary),
      flatMap(spreadUnionArbitraries),
    ),
  )

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
      break
  }

  const nullConstant = constantArbitrary(null)
  const constants = new SameValueSet<unknown>()
  for (const variant of variants) {
    if (variant.type === `constant` && variant !== nullConstant) {
      constants.add(variant.value)
      variants.delete(variant)
    }
  }

  if (constants.size === 1) {
    variants.add(constantArbitrary(get(first(constants))))
  } else if (constants.size > 1) {
    const arbitrary = normalizeArbitrary(enumArbitrary([...constants]))
    if (variants.size === 0) {
      return arbitrary
    }
    variants.add(arbitrary)
  }

  if (!variants.has(nullConstant)) {
    return unionArbitrary([...variants])
  }

  variants.delete(nullConstant)
  return optionArbitrary(normalizeArbitrary(unionArbitrary([...variants])))
}

const spreadUnionArbitraries = (arbitrary: Arbitrary): Iterable<Arbitrary> => {
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
    case `array`:
    case `tuple`:
    case `dictionary`:
    case `record`:
    case `intersection`:
    case `reference`:
    case `recursive-reference`:
    case `function-declaration`:
    case `parameter-reference`:
    case `function-call`:
      return [arbitrary]
    case `option`:
      return concat(spreadUnionArbitraries(arbitrary.arbitrary), [
        constantArbitrary(null),
      ])
    case `enum`:
      return map(constantArbitrary, arbitrary.members)
    case `union`:
      return flatMap(spreadUnionArbitraries, arbitrary.variants)
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
  const arbitraries = pipe(
    arbitrary.arbitraries,
    map(normalizeArbitrary),
    flatMap(spreadIntersectionArbitraries),
    reduce(toSet()),
  )

  const properties: RecordArbitrary[`properties`] = new Map()
  for (const arbitrary of arbitraries) {
    if (arbitrary.type !== `record`) {
      continue
    }
    for (const [name, property] of arbitrary.properties) {
      properties.set(name, property)
    }
    arbitraries.delete(arbitrary)
  }
  if (properties.size > 0) {
    arbitraries.add(recordArbitrary(properties))
  }

  switch (arbitraries.size) {
    case 0:
      return recordArbitrary(new Map())
    case 1:
      return get(first(arbitraries))
    default:
      return intersectionArbitrary([...arbitraries])
  }
}

const spreadIntersectionArbitraries = (
  arbitrary: Arbitrary,
): Iterable<Arbitrary> =>
  arbitrary.type === `intersection`
    ? flatMap(spreadIntersectionArbitraries, arbitrary.arbitraries)
    : [arbitrary]

const normalizeReferenceArbitrary = (
  arbitrary: ReferenceArbitrary,
): Arbitrary =>
  referenceArbitrary({
    ...arbitrary,
    arbitrary: normalizeArbitrary(arbitrary.arbitrary),
  })

const normalizeFunctionDeclarationArbitrary = (
  arbitrary: FunctionDeclarationArbitrary,
): Arbitrary =>
  functionDeclarationArbitrary({
    ...arbitrary,
    arbitrary: normalizeArbitrary(arbitrary.arbitrary),
  })

const normalizeFunctionCallArbitrary = (
  arbitrary: FunctionCallArbitrary,
): Arbitrary =>
  functionCallArbitrary({
    ...arbitrary,
    args: arbitrary.args.map(normalizeArbitrary),
  })

export default normalizeArbitrary
