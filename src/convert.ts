/* eslint-disable typescript/prefer-nullish-coalescing */
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
  Enum,
  IntrinsicType,
  Model,
  ModelIndexer,
  ModelProperty,
  Namespace,
  Numeric,
  Program,
  Scalar,
  Type,
  Union,
} from '@typespec/compiler'
import {
  any,
  concat,
  entries,
  filter,
  flatMap,
  map,
  pipe,
  reduce,
  toArray,
  toMap,
  toObject,
  toSet,
  values,
} from 'lfi'
import keyalesce from 'keyalesce'
import toposort from 'toposort'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ArrayArbitrary,
  DictionaryArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  StringArbitrary,
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

  // eslint-disable-next-line typescript/switch-exhaustiveness-check
  switch (type.kind) {
    case `Intrinsic`:
      return convertIntrinsic(type)
    case `Scalar`:
      return convertScalar(program, type, constraints)
    case `Enum`:
      return convertEnum(type)
    case `Union`:
      return convertUnion(program, type, constraints)
    case `Model`:
      return convertModel(program, type, constraints)
  }

  throw new Error(`Unhandled type: ${type.kind}`)
}

const convertIntrinsic = (intrinsic: IntrinsicType): Arbitrary => {
  switch (intrinsic.name) {
    case `null`:
      return memoize({ type: `null` })
    case `void`:
      return memoize({ type: `undefined` })
    case `never`:
      // Ref this because it's verbose so it's nice to extract a `const never`
      // variable if it's referenced more than once.
      return ref(`never`, memoize({ type: `never` }))
    case `unknown`:
      return memoize({ type: `unknown` })
    case `ErrorType`:
      throw new Error(`Unhandled Intrinsic: ${intrinsic.name}`)
  }
}

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
      arbitrary = memoize({ type: `bytes` })
      break
    case `string`:
      arbitrary = convertString(constraints)
      break
    case `boolean`:
      arbitrary = memoize({ type: `boolean` })
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
    : ref(scalar.name, arbitrary)
}

const convertNumber = (
  scalar: Scalar,
  constraints: Constraints,
  { min, max, isInteger }: { min: number; max: number; isInteger: boolean },
): Arbitrary => {
  const arbitrary = memoize({
    type: `number`,
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

  return ref(scalar.name, arbitrary)
}

const convertBigInt = (
  scalar: Scalar,
  constraints: Constraints,
  { min, max }: { min?: bigint; max?: bigint } = {},
): Arbitrary => {
  const arbitrary = memoize({
    type: `bigint`,
    min: maxOrUndefined(constraints.min?.asBigInt() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asBigInt() ?? undefined, max),
  })

  const hasDefaultConstraints =
    min !== undefined &&
    max !== undefined &&
    arbitrary.min === min &&
    arbitrary.max === max
  return hasDefaultConstraints ? ref(scalar.name, arbitrary) : arbitrary
}

const convertString = (constraints: Constraints): StringArbitrary =>
  memoize({
    type: `string`,
    minLength: constraints.minLength?.asNumber() ?? undefined,
    maxLength: constraints.maxLength?.asNumber() ?? undefined,
  })

const convertEnum = ($enum: Enum): Arbitrary =>
  ref(
    $enum.name,
    memoize({
      type: `enum`,
      values: pipe(
        $enum.members,
        map(([, { name, value }]) => (value === undefined ? name : value)),
        reduce(toArray()),
      ),
    }),
  )

const convertUnion = (
  program: Program,
  union: Union,
  constraints: Constraints,
): Arbitrary => {
  const arbitrary = memoize({
    type: `union`,
    variants: pipe(
      union.variants,
      map(([, { type }]) =>
        convertType(program, type, {
          ...constraints,
          ...getConstraints(program, union),
        }),
      ),
      reduce(toArray()),
    ),
  })
  return union.name ? ref(union.name, arbitrary) : arbitrary
}

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
  const sourcePropertyNames = pipe(
    sourceModels,
    flatMap(model => model.properties.keys()),
    reduce(toSet()),
  )
  const concreteProperties = pipe(
    model.properties,
    filter(([name]) => !sourcePropertyNames.has(name)),
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
    arbitrary = memoize({
      type: `merged`,
      arbitraries: pipe(
        concat(
          map(model => convertType(program, model, constraints), sourceModels),
          concreteProperties.size > 0
            ? [convertRecord(program, model, constraints, concreteProperties)]
            : [],
        ),
        reduce(toArray()),
      ),
    })
  }

  return isTypeSpecNamespace(model.namespace)
    ? arbitrary
    : ref(model.name, arbitrary)
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

  return memoize({
    type: `array`,
    value: convertType(program, indexer.value, constraints),
    minItems,
    maxItems: constraints.maxItems?.asNumber() ?? undefined,
  })
}

const convertDictionary = (
  program: Program,
  indexer: ModelIndexer,
  constraints: Constraints,
): DictionaryArbitrary =>
  memoize({
    type: `dictionary`,
    key: convertType(program, indexer.key, constraints),
    value: convertType(program, indexer.value, constraints),
  })

const convertRecord = (
  program: Program,
  model: Model,
  constraints: Constraints,
  properties: Map<string, ModelProperty> = model.properties,
): RecordArbitrary =>
  memoize({
    type: `record`,
    properties: pipe(
      properties,
      map(([name, property]) => [
        name,
        {
          arbitrary: convertType(program, property.type, {
            ...constraints,
            ...getConstraints(program, property),
          }),
          required: !property.optional,
        },
      ]),
      reduce(toMap()),
    ),
  })

const ref = (name: string, arbitrary: Arbitrary): Arbitrary =>
  memoize({ type: `reference`, name, arbitrary })

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

const memoize = <A extends Arbitrary>(arbitrary: A): A => {
  const arbitraryKey = getArbitraryKey(arbitrary)
  let cachedArbitrary = cachedArbitraries.get(arbitraryKey)
  if (!cachedArbitrary) {
    cachedArbitrary = arbitrary
    cachedArbitraries.set(arbitraryKey, cachedArbitrary)
  }
  return cachedArbitrary as A
}

const getArbitraryKey = (arbitrary: Arbitrary): ArbitraryKey => {
  switch (arbitrary.type) {
    case `null`:
    case `undefined`:
    case `never`:
    case `unknown`:
    case `boolean`:
    case `bytes`:
      return keyalesce([arbitrary.type])
    case `number`:
    case `bigint`:
      return keyalesce([arbitrary.type, arbitrary.min, arbitrary.max])
    case `string`:
      return keyalesce([
        arbitrary.type,
        arbitrary.minLength,
        arbitrary.maxLength,
      ])
    case `enum`:
      return keyalesce([arbitrary.type, ...arbitrary.values])
    case `array`:
      return keyalesce([
        arbitrary.type,
        arbitrary.value,
        arbitrary.minItems,
        arbitrary.maxItems,
      ])
    case `dictionary`:
      return keyalesce([arbitrary.type, arbitrary.key, arbitrary.value])
    case `union`:
      return keyalesce([arbitrary.type, ...arbitrary.variants])
    case `record`:
      return keyalesce([
        arbitrary.type,
        ...flatMap(
          ([name, { arbitrary, required }]) => [name, arbitrary, required],
          arbitrary.properties,
        ),
      ])
    case `merged`:
      return keyalesce([arbitrary.type, ...arbitrary.arbitraries])
    case `reference`:
      return keyalesce([arbitrary.type, arbitrary.name, arbitrary.arbitrary])
  }
}

const cachedArbitraries = new Map<ArbitraryKey, Arbitrary>()
type ArbitraryKey = ReturnType<typeof keyalesce>

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
    case `null`:
    case `undefined`:
    case `never`:
    case `unknown`:
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
    case `merged`:
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
