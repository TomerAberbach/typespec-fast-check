import assert from 'node:assert'
import {
  getMaxItemsAsNumeric,
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMinItemsAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
} from '@typespec/compiler'
import type {
  BooleanLiteral,
  Enum,
  IntrinsicType,
  Model,
  ModelIndexer,
  ModelProperty,
  Namespace,
  Numeric,
  NumericLiteral,
  ObjectType,
  Program,
  Scalar,
  StringLiteral,
  Type,
  Union,
  Value,
} from '@typespec/compiler'
import {
  all,
  any,
  concat,
  entries,
  filter,
  first,
  flatMap,
  get,
  map,
  pipe,
  reduce,
  toArray,
  toMap,
  toObject,
  toSet,
  unique,
  values,
} from 'lfi'
import toposort from 'toposort'
import {
  anythingArbitrary,
  arrayArbitrary,
  bigintArbitrary,
  booleanArbitrary,
  bytesArbitrary,
  constantArbitrary,
  dictionaryArbitrary,
  enumArbitrary,
  intersectionArbitrary,
  neverArbitrary,
  numberArbitrary,
  recordArbitrary,
  referenceArbitrary,
  stringArbitrary,
  unionArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ArrayArbitrary,
  ConstantArbitrary,
  DictionaryArbitrary,
  IntersectionArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  StringArbitrary,
  UnionArbitrary,
} from './arbitrary.ts'
import { fastCheckNumerics, numerics } from './numerics.ts'

const convertProgram = (
  program: Program,
): {
  namespace: ArbitraryNamespace
  sharedArbitraries: Set<ReferenceArbitrary>
} => {
  const namespace = convertNamespace(program, program.getGlobalNamespaceType())
  const sharedArbitraries = collectSharedArbitraries(namespace)
  return { namespace, sharedArbitraries }
}

const convertNamespace = (
  program: Program,
  namespace: Namespace,
): ArbitraryNamespace => {
  const nameToArbitrary = pipe(
    concat<[string, Type]>(
      namespace.models,
      namespace.unions,
      namespace.enums,
      namespace.scalars,
    ),
    map(([, type]) => {
      const arbitrary = convertType(program, type, {})
      assert(arbitrary.type === `reference`)
      return [arbitrary.name, arbitrary]
    }),
    reduce(toMap()),
  )
  return {
    name: namespace.name,
    namespaces: pipe(
      values(namespace.namespaces),
      filter(namespace => !isTypeSpecNamespace(namespace)),
      map(namespace => convertNamespace(program, namespace)),
      reduce(toArray()),
    ),
    nameToArbitrary,
    arbitraryToName: pipe(
      nameToArbitrary,
      map(([name, arbitrary]) => [arbitrary, name]),
      reduce(toMap()),
    ),
  }
}

const convertType = (
  program: Program,
  type: Type,
  constraints: Constraints,
): Arbitrary => {
  constraints = { ...constraints, ...getConstraints(program, type) }
  let arbitrary: Arbitrary

  switch (type.kind) {
    case `Intrinsic`:
      arbitrary = convertIntrinsic(type)
      break
    case `Boolean`:
    case `Number`:
    case `String`:
      arbitrary = convertLiteral(type)
      break
    case `Scalar`:
      arbitrary = convertScalar(program, type, constraints)
      break
    case `Enum`:
      arbitrary = convertEnum(type)
      break
    case `Union`:
      arbitrary = convertUnion(program, type, constraints)
      break
    case `Object`:
      arbitrary = convertObject(program, type, constraints)
      break
    case `Model`:
      arbitrary = convertModel(program, type, constraints)
      break
    case `EnumMember`:
    case `Namespace`:
    case `ModelProperty`:
    case `Decorator`:
    case `Interface`:
    case `Function`:
    case `FunctionParameter`:
    case `ScalarConstructor`:
    case `Operation`:
    case `Projection`:
    case `UnionVariant`:
    case `TemplateParameter`:
    case `StringTemplate`:
    case `StringTemplateSpan`:
    case `Tuple`:
      throw new Error(`Unhandled type: ${type.kind}`)
  }

  return normalizeArbitrary(arbitrary)
}

const convertIntrinsic = (intrinsic: IntrinsicType): Arbitrary => {
  switch (intrinsic.name) {
    case `null`:
      return constantArbitrary(null)
    case `void`:
      return constantArbitrary(undefined)
    case `never`:
      // Ref this because it's verbose so it's nice to extract a `const never`
      // variable if it's referenced more than once.
      return referenceArbitrary(`never`, neverArbitrary())
    case `unknown`:
      return anythingArbitrary()
    case `ErrorType`:
      throw new Error(`Unhandled Intrinsic: ${intrinsic.name}`)
  }
}

const convertLiteral = (
  literal: BooleanLiteral | NumericLiteral | StringLiteral,
): Arbitrary => constantArbitrary(literal.value)

const convertScalar = (
  program: Program,
  scalar: Scalar,
  constraints: Constraints,
): Arbitrary => {
  let arbitrary: Arbitrary | undefined
  switch (scalar.name) {
    case `int8`:
    case `int16`:
    case `int32`:
    case `safeint`:
    case `float32`:
    case `float64`:
      arbitrary = convertNumber(scalar, constraints, numerics[scalar.name])
      break
    case `float`:
    case `decimal128`:
    case `decimal`:
    case `numeric`:
      arbitrary = convertNumber(scalar, constraints, numerics.float64)
      break
    case `int64`:
      arbitrary = convertBigInt(scalar, constraints, numerics.int64)
      break
    case `integer`:
      arbitrary = convertBigInt(scalar, constraints)
      break
    case `bytes`:
      arbitrary = bytesArbitrary()
      break
    case `string`:
      arbitrary = convertString(constraints)
      break
    case `boolean`:
      arbitrary = booleanArbitrary()
      break
    default:
      if (scalar.baseScalar) {
        arbitrary = convertType(program, scalar.baseScalar, {
          ...constraints,
          ...getConstraints(program, scalar),
        })
      }
      break
  }

  if (!arbitrary) {
    throw new Error(`Unhandled Scalar: ${scalar.name}`)
  }

  return isTypeSpecNamespace(scalar.namespace)
    ? arbitrary
    : referenceArbitrary(scalar.name, arbitrary)
}

const convertNumber = (
  scalar: Scalar,
  constraints: Constraints,
  { min, max, isInteger }: { min: number; max: number; isInteger: boolean },
): Arbitrary => {
  const arbitrary = numberArbitrary({
    min: maxOrUndefined(constraints.min?.asNumber() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asNumber() ?? undefined, max),
    isInteger,
  })

  const hasDefaultConstraints = arbitrary.min === min && arbitrary.max === max
  if (!hasDefaultConstraints) {
    return arbitrary
  }

  const matchesFastCheckNumeric = pipe(
    values(fastCheckNumerics),
    any(
      numeric =>
        arbitrary.min === numeric.min.value &&
        arbitrary.max === numeric.max.value &&
        arbitrary.isInteger === numeric.isInteger,
    ),
  )
  if (matchesFastCheckNumeric) {
    return arbitrary
  }

  return referenceArbitrary(scalar.name, arbitrary)
}

const convertBigInt = (
  scalar: Scalar,
  constraints: Constraints,
  { min, max }: { min?: bigint; max?: bigint } = {},
): Arbitrary => {
  const arbitrary = bigintArbitrary({
    min: maxOrUndefined(constraints.min?.asBigInt() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asBigInt() ?? undefined, max),
  })

  const hasDefaultConstraints =
    min !== undefined &&
    max !== undefined &&
    arbitrary.min === min &&
    arbitrary.max === max
  return hasDefaultConstraints
    ? referenceArbitrary(scalar.name, arbitrary)
    : arbitrary
}

const convertString = (constraints: Constraints): StringArbitrary =>
  stringArbitrary({
    minLength: constraints.minLength?.asNumber() ?? undefined,
    maxLength: constraints.maxLength?.asNumber() ?? undefined,
  })

const convertEnum = ($enum: Enum): Arbitrary =>
  referenceArbitrary(
    $enum.name,
    enumArbitrary(
      pipe(
        $enum.members,
        map(([, { name, value }]) => value ?? name),
        reduce(toArray()),
      ),
    ),
  )

const convertUnion = (
  program: Program,
  union: Union,
  constraints: Constraints,
): Arbitrary => {
  const arbitrary = unionArbitrary(
    pipe(
      union.variants,
      map(([, { type }]) =>
        convertType(program, type, {
          ...constraints,
          ...getConstraints(program, union),
        }),
      ),
      reduce(toArray()),
    ),
  )
  return union.name ? referenceArbitrary(union.name, arbitrary) : arbitrary
}

const convertObject = (
  program: Program,
  object: ObjectType,
  constraints: Constraints,
) =>
  recordArbitrary(
    pipe(
      entries(object.properties),
      map(([name, type]) => [
        name,
        { arbitrary: convertType(program, type, constraints), required: true },
      ]),
      reduce(toMap()),
    ),
  )

const convertModel = (
  program: Program,
  model: Model,
  constraints: Constraints,
): Arbitrary => {
  const sourceModels = pipe(
    concat(
      filter(model => model !== undefined, [model.baseModel]),
      map(({ model }) => model, model.sourceModels),
    ),
    reduce(toSet()),
  )
  const concreteProperties = pipe(
    model.properties,
    filter(([, value]) => !value.sourceProperty),
    reduce(toMap()),
  )

  const baseModel = model.baseModel ?? model.sourceModel
  let arbitrary: Arbitrary
  if (baseModel && concreteProperties.size === 0) {
    // The model is just `model A extends B` or `model A is B` so we can just
    // convert `B`.
    arbitrary = convertType(program, baseModel, {
      ...constraints,
      ...getConstraints(program, model),
    })
  } else if (sourceModels.size === 0) {
    arbitrary = model.indexer
      ? convertModelIndexer(program, model.indexer, constraints)
      : convertRecord(program, model, constraints)
  } else {
    arbitrary = intersectionArbitrary(
      pipe(
        concat(
          map(model => convertType(program, model, constraints), sourceModels),
          concreteProperties.size > 0
            ? [convertRecord(program, model, constraints, concreteProperties)]
            : [],
        ),
        reduce(toArray()),
      ),
    )
  }

  return isTypeSpecNamespace(model.namespace)
    ? arbitrary
    : referenceArbitrary(model.name, arbitrary)
}

const convertModelIndexer = (
  program: Program,
  indexer: ModelIndexer,
  constraints: Constraints,
): Arbitrary =>
  (indexer.key.name === `integer` ? convertArray : convertDictionary)(
    program,
    indexer,
    constraints,
  )

const convertArray = (
  program: Program,
  indexer: ModelIndexer,
  constraints: Constraints,
): ArrayArbitrary => {
  let minItems = constraints.minItems?.asNumber() ?? undefined
  if (minItems === 0) {
    minItems = undefined
  }

  return arrayArbitrary(convertType(program, indexer.value, constraints), {
    minItems,
    maxItems: constraints.maxItems?.asNumber() ?? undefined,
  })
}

const convertDictionary = (
  program: Program,
  indexer: ModelIndexer,
  constraints: Constraints,
): DictionaryArbitrary =>
  dictionaryArbitrary(
    convertType(program, indexer.key, constraints),
    convertType(program, indexer.value, constraints),
  )

const convertRecord = (
  program: Program,
  model: Model,
  constraints: Constraints,
  properties: Map<string, ModelProperty> = model.properties,
): RecordArbitrary =>
  recordArbitrary(
    pipe(
      properties,
      map(([name, property]) => {
        const arbitrary = convertType(program, property.type, {
          ...constraints,
          ...getConstraints(program, property),
        })
        return [
          name,
          property.defaultValue
            ? {
                arbitrary: unionArbitrary([
                  arbitrary,
                  convertValue(property.defaultValue),
                ]),
                required: false,
              }
            : { arbitrary, required: !property.optional },
        ]
      }),
      reduce(toMap()),
    ),
  )

const convertValue = (value: Value): ConstantArbitrary =>
  constantArbitrary(toJsValue(value))

const toJsValue = (value: Value): unknown => {
  switch (value.valueKind) {
    case `NullValue`:
    case `BooleanValue`:
    case `StringValue`:
      return value.value
    case `NumericValue`: {
      const numeric = value.value
      return numeric.asNumber() ?? numeric.asBigInt()
    }
    case `ScalarValue`:
      return toJsValue(value.value.args[0]!)
    case `EnumValue`: {
      const member = value.value
      return member.value ?? member.name
    }
    case `ArrayValue`:
      return value.values.map(toJsValue)
    case `ObjectValue`:
      return pipe(
        value.properties,
        map(([key, property]) => [key, toJsValue(property.value)]),
        reduce(toObject()),
      )
  }
}

const getConstraints = (program: Program, type: Type): Constraints =>
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
  )
type Constraints = {
  min?: Numeric
  max?: Numeric
  minLength?: Numeric
  maxLength?: Numeric
  minItems?: Numeric
  maxItems?: Numeric
}

const normalizeArbitrary = (arbitrary: Arbitrary): Arbitrary => {
  switch (arbitrary.type) {
    case `never`:
    case `anything`:
    case `constant`:
    case `boolean`:
    case `number`:
    case `bigint`:
    case `string`:
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

const collectSharedArbitraries = (
  namespace: ArbitraryNamespace,
): Set<ReferenceArbitrary> => {
  const arbitraryReferenceCounts = new Map<Arbitrary, number>()
  const arbitraryDependencies = new Map<Arbitrary, Set<Arbitrary>>()

  const remainingNamespaces = [namespace]
  do {
    const namespace = remainingNamespaces.pop()!
    remainingNamespaces.push(...namespace.namespaces)

    for (const namespaceArbitrary of namespace.arbitraryToName.keys()) {
      arbitraryReferenceCounts.set(
        namespaceArbitrary,
        (arbitraryReferenceCounts.get(namespaceArbitrary) ?? 0) + 1,
      )
    }

    const remainingArbitraries: Arbitrary[] = [
      ...namespace.arbitraryToName.keys(),
    ]
    while (remainingArbitraries.length > 0) {
      const arbitrary = remainingArbitraries.pop()!
      if (arbitraryDependencies.has(arbitrary)) {
        continue
      }

      const dependencies = getDirectArbitraryDependencies(arbitrary)
      arbitraryDependencies.set(arbitrary, new Set(dependencies))

      for (const referencedArbitrary of dependencies) {
        remainingArbitraries.push(referencedArbitrary)
        arbitraryReferenceCounts.set(
          referencedArbitrary,
          (arbitraryReferenceCounts.get(referencedArbitrary) ?? 0) + 1,
        )
      }
    }
  } while (remainingNamespaces.length > 0)

  const sharedArbitraryDependencyGraph = pipe(
    arbitraryDependencies,
    flatMap(([arbitrary, dependencies]) =>
      pipe(
        dependencies,
        values,
        map(dependency => [arbitrary, dependency]),
      ),
    ),
    reduce(toArray()),
  )

  return pipe(
    toposort(sharedArbitraryDependencyGraph).reverse(),
    filter(
      (arbitrary): arbitrary is ReferenceArbitrary =>
        arbitrary.type === `reference` &&
        (arbitraryReferenceCounts.get(arbitrary) ?? 0) >= 2,
    ),
    reduce(toSet()),
  )
}

const getDirectArbitraryDependencies = (arbitrary: Arbitrary): Arbitrary[] => {
  switch (arbitrary.type) {
    case `never`:
    case `anything`:
    case `constant`:
    case `boolean`:
    case `number`:
    case `bigint`:
    case `string`:
    case `bytes`:
    case `enum`:
      return []
    case `array`:
      return [arbitrary.value]
    case `dictionary`:
      return [arbitrary.key, arbitrary.value]
    case `union`:
      return arbitrary.variants
    case `record`:
      return pipe(
        values(arbitrary.properties),
        map(property => property.arbitrary),
        reduce(toArray()),
      )
    case `intersection`:
      return arbitrary.arbitraries
    case `reference`:
      return [arbitrary.arbitrary]
  }
}

const isTypeSpecNamespace = (namespace?: Namespace): boolean =>
  namespace?.name === `TypeSpec`

const minOrUndefined = <
  const A extends bigint | number | undefined,
  const B extends bigint | number | undefined,
>(
  a: A,
  b: B,
): A extends undefined
  ? B extends undefined
    ? undefined
    : Exclude<A | B, undefined>
  : Exclude<A | B, undefined> => {
  const min = (() => {
    if (a === undefined) {
      return b
    } else if (b === undefined) {
      return a
    } else {
      return a < b ? a : b
    }
  })()
  // eslint-disable-next-line typescript/no-unsafe-return
  return min as any
}

const maxOrUndefined = <
  const A extends bigint | number | undefined,
  const B extends bigint | number | undefined,
>(
  a: A,
  b: B,
): A extends undefined
  ? B extends undefined
    ? undefined
    : Exclude<A | B, undefined>
  : Exclude<A | B, undefined> => {
  const max = (() => {
    if (a === undefined) {
      return b
    } else if (b === undefined) {
      return a
    } else {
      return a > b ? a : b
    }
  })()
  // eslint-disable-next-line typescript/no-unsafe-return
  return max as any
}

export default convertProgram
