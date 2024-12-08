/* eslint-disable typescript/prefer-nullish-coalescing */
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
import pascalcase from 'pascalcase'
import keyalesce from 'keyalesce'
import toposort from 'toposort'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ArrayArbitrary,
  BigIntArbitrary,
  BooleanArbitrary,
  BytesArbitrary,
  DictionaryArbitrary,
  EnumArbitrary,
  IntrinsicArbitrary,
  NeverArbitrary,
  NullArbitrary,
  NumberArbitrary,
  RecordArbitrary,
  StringArbitrary,
  UndefinedArbitrary,
  UnionArbitrary,
  UnknownArbitrary,
} from './arbitrary.ts'
import { numerics } from './numerics.ts'

const convertProgram = (
  program: Program,
): {
  namespace: ArbitraryNamespace
  sharedArbitraries: Set<Arbitrary>
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
    map(([name, type]) => [
      name,
      convertType(program, type, { sourceName: name, constraints: {} }),
    ]),
    reduce(toMap()),
  )
  return {
    name: namespace.name,
    namespaces: pipe(
      values(namespace.namespaces),
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
  { sourceName, constraints }: ConvertTypeOptions,
): Arbitrary => {
  const options = {
    sourceName,
    constraints: { ...constraints, ...getConstraints(program, type) },
  }

  // eslint-disable-next-line typescript/switch-exhaustiveness-check
  switch (type.kind) {
    case `Intrinsic`:
      return convertIntrinsic(type)
    case `Scalar`:
      return convertScalar(program, type, options)
    case `Enum`:
      return convertEnum(type, options)
    case `Union`:
      return convertUnion(program, type, options)
    case `Model`:
      return convertModel(program, type, options)
  }

  throw new Error(`Unhandled type: ${type.kind}`)
}
type ConvertTypeOptions = {
  sourceName?: string
  constraints: Constraints
}
const convertIntrinsic = (intrinsic: IntrinsicType): IntrinsicArbitrary => {
  switch (intrinsic.name) {
    case `null`:
      return convertNull(intrinsic)
    case `void`:
      return convertVoid(intrinsic)
    case `never`:
      return convertNever(intrinsic)
    case `unknown`:
      return convertUnknown(intrinsic)
    case `ErrorType`:
      throw new Error(`Unhandled Intrinsic: ${intrinsic.name}`)
  }
}

const convertNull = ($null: IntrinsicType): NullArbitrary =>
  memoize({ type: `null`, name: $null.name })

const convertVoid = ($void: IntrinsicType): UndefinedArbitrary =>
  memoize({ type: `undefined`, name: $void.name })

const convertNever = (never: IntrinsicType): NeverArbitrary =>
  memoize({ type: `never`, name: never.name })

const convertUnknown = (unknown: IntrinsicType): UnknownArbitrary =>
  memoize({ type: `unknown`, name: unknown.name })

const convertScalar = (
  program: Program,
  scalar: Scalar,
  options: ConvertTypeOptions,
): Arbitrary => {
  switch (scalar.name) {
    case `int8`:
    case `int16`:
    case `int32`:
    case `safeint`:
    case `float32`:
    case `float64`:
      return convertNumber(scalar, options, numerics[scalar.name])
    case `float`:
    case `decimal128`:
    case `decimal`:
    case `numeric`:
      return convertNumber(scalar, options, numerics.float64)
    case `int64`:
      return convertBigInt(scalar, options, numerics.int64)
    case `integer`:
      return convertBigInt(scalar, options)
    case `bytes`:
      return convertBytes(scalar)
    case `string`:
      return convertString(scalar, options)
    case `boolean`:
      return convertBoolean(scalar)
    default:
      if (scalar.baseScalar) {
        return ref(
          convertScalar(program, scalar.baseScalar, {
            ...options,
            constraints: {
              ...options.constraints,
              ...getConstraints(program, scalar),
            },
          }),
        )
      }
  }

  throw new Error(`Unhandled Scalar: ${scalar.name}`)
}

const convertNumber = (
  number: Scalar,
  { constraints }: ConvertTypeOptions,
  { min, max, isInteger }: { min: number; max: number; isInteger: boolean },
): NumberArbitrary =>
  memoize({
    type: `number`,
    name: number.name,
    min: maxOrUndefined(constraints.min?.asNumber() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asNumber() ?? undefined, max),
    isInteger,
  })

const convertBigInt = (
  bigint: Scalar,
  { constraints }: ConvertTypeOptions,
  { min, max }: { min?: bigint; max?: bigint } = {},
): BigIntArbitrary =>
  memoize({
    type: `bigint`,
    name: bigint.name,
    min: maxOrUndefined(constraints.min?.asBigInt() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asBigInt() ?? undefined, max),
  })

const convertBytes = (bytes: Scalar): BytesArbitrary =>
  memoize({ type: `bytes`, name: bytes.name })

const convertString = (
  string: Scalar,
  { constraints }: ConvertTypeOptions,
): StringArbitrary =>
  memoize({
    type: `string`,
    name: string.name,
    minLength: constraints.minLength?.asNumber() ?? undefined,
    maxLength: constraints.maxLength?.asNumber() ?? undefined,
  })

const convertBoolean = (boolean: Scalar): BooleanArbitrary =>
  memoize({ type: `boolean`, name: boolean.name })

const convertEnum = (
  $enum: Enum,
  { sourceName }: ConvertTypeOptions,
): EnumArbitrary =>
  memoize({
    type: `enum`,
    name: pascalcase($enum.name || sourceName || `Enum`),
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
  { sourceName, constraints }: ConvertTypeOptions,
): UnionArbitrary =>
  memoize({
    type: `union`,
    name: pascalcase(union.name || sourceName || `Union`),
    variants: pipe(
      union.variants,
      map(([, { type, name }]) =>
        convertType(program, type, {
          sourceName: String(name),
          constraints: { ...constraints, ...getConstraints(program, union) },
        }),
      ),
      reduce(toArray()),
    ),
  })

const convertModel = (
  program: Program,
  model: Model,
  options: ConvertTypeOptions,
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
    return ref(
      convertType(program, baseModel, {
        ...options,
        constraints: {
          ...options.constraints,
          ...getConstraints(program, model),
        },
      }),
    )
  }

  if (sourceModels.size === 0) {
    if (!model.indexer) {
      return convertRecord(program, model, options)
    }

    const modelWithIndexer = model as Model & { indexer: ModelIndexer }
    return model.indexer.key.name === `integer`
      ? convertArray(program, modelWithIndexer, options)
      : convertDictionary(program, modelWithIndexer, options)
  }

  const arbitraries = pipe(
    concat(
      map(model => convertType(program, model, options), sourceModels),
      concreteProperties.size > 0
        ? [convertRecord(program, model, options, concreteProperties)]
        : [],
    ),
    reduce(toArray()),
  )
  return memoize({
    type: `merged`,
    name: pascalcase(model.name || options.sourceName || `Model`),
    arbitraries,
  })
}

const convertArray = (
  program: Program,
  model: Model & { indexer: ModelIndexer },
  options: ConvertTypeOptions,
): ArrayArbitrary => {
  let minItems = options.constraints.minItems?.asNumber() ?? undefined
  if (minItems === 0) {
    minItems = undefined
  }

  return memoize({
    type: `array`,
    name: pascalcase(model.name || options.sourceName || `Array`),
    value: convertType(program, model.indexer.value, options),
    minItems,
    maxItems: options.constraints.maxItems?.asNumber() ?? undefined,
  })
}

const convertDictionary = (
  program: Program,
  model: Model & { indexer: ModelIndexer },
  options: ConvertTypeOptions,
): DictionaryArbitrary =>
  memoize({
    type: `dictionary`,
    name: pascalcase(model.name || options.sourceName || `Dictionary`),
    key: convertType(program, model.indexer.key, options),
    value: convertType(program, model.indexer.value, options),
  })

const convertRecord = (
  program: Program,
  model: Model,
  { sourceName, constraints }: ConvertTypeOptions,
  properties: Map<string, ModelProperty> = model.properties,
): RecordArbitrary =>
  memoize({
    type: `record`,
    name: pascalcase(model.name || sourceName || `Record`),
    properties: pipe(
      properties,
      map(([name, property]) => [
        name,
        convertType(program, property.type, {
          sourceName: name,
          constraints: { ...constraints, ...getConstraints(program, property) },
        }),
      ]),
      reduce(toMap()),
    ),
  })

const ref = (arbitrary: Arbitrary): Arbitrary => ({
  type: `reference`,
  name: `Reference`,
  arbitrary,
})

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
      return keyalesce([arbitrary.type, arbitrary.name])
    case `number`:
    case `bigint`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.min,
        arbitrary.max,
      ])
    case `string`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.minLength,
        arbitrary.maxLength,
      ])
    case `enum`:
      return keyalesce([arbitrary.type, arbitrary.name, ...arbitrary.values])
    case `array`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.value,
        arbitrary.minItems,
        arbitrary.maxItems,
      ])
    case `dictionary`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.key,
        arbitrary.value,
      ])
    case `union`:
      return keyalesce([arbitrary.type, arbitrary.name, ...arbitrary.variants])
    case `record`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        ...flatten(arbitrary.properties),
      ])
    case `merged`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        ...arbitrary.arbitraries,
      ])
    case `reference`:
      return keyalesce([arbitrary.type, arbitrary.name, arbitrary.arbitrary])
  }
}

const cachedArbitraries = new Map<ArbitraryKey, Arbitrary>()
type ArbitraryKey = ReturnType<typeof keyalesce>

const collectSharedArbitraries = (
  namespace: ArbitraryNamespace,
): Set<Arbitrary> => {
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

    const remainingArbitraries = [...namespace.arbitraryToName.keys()]
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
    flatMap(
      ([arbitrary, dependencies]): Iterable<
        [Arbitrary, Arbitrary | undefined]
      > =>
        dependencies.size === 0
          ? [[arbitrary, undefined]]
          : pipe(
              dependencies,
              values,
              map(dependency => [arbitrary, dependency]),
            ),
    ),
    reduce(toArray()),
  )

  return pipe(
    toposort(sharedArbitraryDependencyGraph).reverse(),
    filter(arbitrary => (arbitraryReferenceCounts.get(arbitrary) ?? 0) >= 2),
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
