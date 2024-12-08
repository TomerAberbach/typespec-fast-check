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
  concat,
  entries,
  filter,
  flatMap,
  flatten,
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
  BigIntArbitrary,
  DictionaryArbitrary,
  IntrinsicArbitrary,
  NumberArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  StringArbitrary,
  UnionArbitrary,
} from './arbitrary.ts'
import { numerics } from './numerics.ts'

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
      // Don't convert the built-in namespace.
      filter(namespace => namespace.name !== `TypeSpec`),
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
    case `Enum`:
    case `Union`:
    case `Model`:
      return convertReference(program, type, constraints)
  }

  throw new Error(`Unhandled type: ${type.kind}`)
}

const convertIntrinsic = (intrinsic: IntrinsicType): IntrinsicArbitrary => {
  switch (intrinsic.name) {
    case `null`:
      return memoize({ type: `null` })
    case `void`:
      return memoize({ type: `undefined` })
    case `never`:
      return memoize({ type: `never` })
    case `unknown`:
      return memoize({ type: `unknown` })
    case `ErrorType`:
      throw new Error(`Unhandled Intrinsic: ${intrinsic.name}`)
  }
}

const convertReference = (
  program: Program,
  type: Scalar | Enum | Union | Model,
  constraints: Constraints,
): Arbitrary => {
  let arbitrary: Arbitrary
  switch (type.kind) {
    case `Scalar`:
      arbitrary = convertScalar(program, type, constraints)
      break
    case `Enum`:
      arbitrary = convertEnum(type)
      break
    case `Union`:
      arbitrary = convertUnion(program, type, constraints)
      break
    case `Model`:
      arbitrary = convertModel(program, type, constraints)
      break
  }

  const { name } = type
  return name ? ref(name, arbitrary) : arbitrary
}

const convertScalar = (
  program: Program,
  scalar: Scalar,
  constraints: Constraints,
): Arbitrary => {
  switch (scalar.name) {
    case `int8`:
    case `int16`:
    case `int32`:
    case `safeint`:
    case `float32`:
    case `float64`:
      return convertNumber(constraints, numerics[scalar.name])
    case `float`:
    case `decimal128`:
    case `decimal`:
    case `numeric`:
      return convertNumber(constraints, numerics.float64)
    case `int64`:
      return convertBigInt(constraints, numerics.int64)
    case `integer`:
      return convertBigInt(constraints)
    case `bytes`:
      return memoize({ type: `bytes` })
    case `string`:
      return convertString(constraints)
    case `boolean`:
      return memoize({ type: `boolean` })
    default:
      if (scalar.baseScalar) {
        return convertType(program, scalar.baseScalar, {
          ...constraints,
          ...getConstraints(program, scalar),
        })
      }
  }

  throw new Error(`Unhandled Scalar: ${scalar.name}`)
}

const convertNumber = (
  constraints: Constraints,
  { min, max, isInteger }: { min: number; max: number; isInteger: boolean },
): NumberArbitrary =>
  memoize({
    type: `number`,
    min: maxOrUndefined(constraints.min?.asNumber() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asNumber() ?? undefined, max),
    isInteger,
  })

const convertBigInt = (
  constraints: Constraints,
  { min, max }: { min?: bigint; max?: bigint } = {},
): BigIntArbitrary =>
  memoize({
    type: `bigint`,
    min: maxOrUndefined(constraints.min?.asBigInt() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asBigInt() ?? undefined, max),
  })

const convertString = (constraints: Constraints): StringArbitrary =>
  memoize({
    type: `string`,
    minLength: constraints.minLength?.asNumber() ?? undefined,
    maxLength: constraints.maxLength?.asNumber() ?? undefined,
  })

const convertEnum = ($enum: Enum): Arbitrary =>
  memoize({
    type: `enum`,
    values: pipe(
      $enum.members,
      map(([, { name, value }]) =>
        JSON.stringify(value === undefined ? name : value),
      ),
      reduce(toArray()),
    ),
  })

const convertUnion = (
  program: Program,
  union: Union,
  constraints: Constraints,
): UnionArbitrary =>
  memoize({
    type: `union`,
    variants: pipe(
      union.variants,
      map(([, { type, name }]) =>
        ref(
          String(name),
          convertType(program, type, {
            ...constraints,
            ...getConstraints(program, union),
          }),
        ),
      ),
      reduce(toArray()),
    ),
  })

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
  if (baseModel && concreteProperties.size === 0) {
    // The model is just `model A extends B` or `model A is B` so we can just
    // convert `B`.
    return convertType(program, baseModel, {
      ...constraints,
      ...getConstraints(program, model),
    })
  }

  if (sourceModels.size === 0) {
    return model.indexer
      ? convertModelIndexer(program, model.indexer, constraints)
      : convertRecord(program, model, constraints)
  }

  const arbitraries = pipe(
    concat(
      map(model => convertType(program, model, constraints), sourceModels),
      concreteProperties.size > 0
        ? [convertRecord(program, model, constraints, concreteProperties)]
        : [],
    ),
    reduce(toArray()),
  )
  return memoize({ type: `merged`, arbitraries })
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
        ref(
          name,
          convertType(program, property.type, {
            ...constraints,
            ...getConstraints(program, property),
          }),
        ),
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
      return keyalesce([arbitrary.type, ...flatten(arbitrary.properties)])
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
      arbitraryDependencies.set(arbitrary, dependencies)

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

const getDirectArbitraryDependencies = (
  arbitrary: Arbitrary,
): Set<Arbitrary> => {
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
      return new Set()
    case `array`:
      return new Set([arbitrary.value])
    case `dictionary`:
      return new Set([arbitrary.key, arbitrary.value])
    case `union`:
      return new Set(arbitrary.variants)
    case `record`:
      return new Set(values(arbitrary.properties))
    case `merged`:
      return new Set(arbitrary.arbitraries)
    case `reference`:
      return new Set([arbitrary.arbitrary])
  }
}

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
