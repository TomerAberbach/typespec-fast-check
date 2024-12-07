/* eslint-disable typescript/prefer-nullish-coalescing */
import {
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
} from '@typespec/compiler'
import type {
  Enum,
  IntrinsicType,
  Model,
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
import type { Arbitrary, ArbitraryNamespace } from './arbitrary.ts'
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
    map(([name, type]): [string, Arbitrary] => [
      name,
      convertType(program, type, { propertyName: name, constraints: {} }),
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
      map(([name, arbitrary]): [Arbitrary, string] => [arbitrary, name]),
      reduce(toMap()),
    ),
  }
}

const convertType = (
  program: Program,
  type: Type,
  { propertyName, constraints }: ConvertTypeOptions,
): Arbitrary => {
  const options = {
    propertyName,
    constraints: { ...constraints, ...getConstraints(program, type) },
  }

  // eslint-disable-next-line typescript/switch-exhaustiveness-check
  switch (type.kind) {
    case `Model`:
      return convertModel(program, type, options)
    case `Union`:
      return convertUnion(program, type, options)
    case `Enum`:
      return convertEnum(type, options)
    case `Scalar`:
      return convertScalar(program, type, options)
    case `Intrinsic`:
      return convertIntrinsic(type)
  }

  throw new Error(`Unhandled type: ${type.kind}`)
}
type ConvertTypeOptions = {
  propertyName?: string
  constraints: Constraints
}

const convertModel = (
  program: Program,
  model: Model,
  { propertyName, constraints }: ConvertTypeOptions,
): Arbitrary =>
  memoize({
    type: `record`,
    name: pascalcase(model.name || propertyName || `Record`),
    properties: pipe(
      model.properties,
      map(([name, property]): [string, Arbitrary] => [
        name,
        convertType(program, property.type, {
          propertyName: name,
          constraints: { ...constraints, ...getConstraints(program, property) },
        }),
      ]),
      reduce(toMap()),
    ),
  })

const convertUnion = (
  program: Program,
  union: Union,
  { propertyName, constraints }: ConvertTypeOptions,
): Arbitrary =>
  memoize({
    type: `union`,
    name: pascalcase(union.name || propertyName || `Union`),
    variants: pipe(
      union.variants,
      map(([, { type, name }]) =>
        convertType(program, type, {
          propertyName: String(name),
          constraints: { ...constraints, ...getConstraints(program, union) },
        }),
      ),
      reduce(toArray()),
    ),
  })

const convertEnum = (
  $enum: Enum,
  { propertyName }: ConvertTypeOptions,
): Arbitrary =>
  memoize({
    type: `enum`,
    name: pascalcase($enum.name || propertyName || `Enum`),
    values: pipe(
      $enum.members,
      map(([, { value }]) => JSON.stringify(value)),
      reduce(toArray()),
    ),
  })

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
        return convertType(program, scalar.baseScalar, {
          ...options,
          constraints: {
            ...options.constraints,
            ...getConstraints(program, scalar),
          },
        })
      }
  }

  throw new Error(`Unhandled Scalar: ${scalar.name}`)
}

const convertNumber = (
  number: Scalar,
  { constraints }: ConvertTypeOptions,
  { min, max, isInteger }: { min: number; max: number; isInteger: boolean },
): Arbitrary =>
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
): Arbitrary =>
  memoize({
    type: `bigint`,
    name: bigint.name,
    min: maxOrUndefined(constraints.min?.asBigInt() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asBigInt() ?? undefined, max),
  })

const convertBytes = (bytes: Scalar): Arbitrary =>
  memoize({ type: `bytes`, name: bytes.name })

const convertString = (
  string: Scalar,
  { constraints }: ConvertTypeOptions,
): Arbitrary =>
  memoize({
    type: `string`,
    name: string.name,
    minLength: constraints.minLength?.asNumber() ?? undefined,
    maxLength: constraints.maxLength?.asNumber() ?? undefined,
  })

const convertBoolean = (boolean: Scalar): Arbitrary =>
  memoize({ type: `boolean`, name: boolean.name })

const convertIntrinsic = (intrinsic: IntrinsicType): Arbitrary => {
  switch (intrinsic.name) {
    case `null`:
      return convertNull(intrinsic)
    case `ErrorType`:
    case `void`:
    case `never`:
    case `unknown`:
      throw new Error(`Unhandled Intrinsic: ${intrinsic.name}`)
  }
}

const convertNull = ($null: IntrinsicType): Arbitrary =>
  memoize({ type: `null`, name: $null.name })

const getConstraints = (program: Program, type: Type): Constraints =>
  pipe(
    entries({
      min: getMinValueAsNumeric(program, type),
      max: getMaxValueAsNumeric(program, type),
      minLength: getMinLengthAsNumeric(program, type),
      maxLength: getMaxLengthAsNumeric(program, type),
    }),
    filter(([, value]) => value !== undefined),
    reduce(toObject()),
  )
type Constraints = {
  min?: Numeric
  max?: Numeric
  minLength?: Numeric
  maxLength?: Numeric
}

const memoize = (arbitrary: Arbitrary): Arbitrary => {
  const arbitraryKey = getArbitraryKey(arbitrary)
  let cachedArbitrary = cachedArbitraries.get(arbitraryKey)
  if (!cachedArbitrary) {
    cachedArbitrary = arbitrary
    cachedArbitraries.set(arbitraryKey, cachedArbitrary)
  }
  return cachedArbitrary
}

const getArbitraryKey = (arbitrary: Arbitrary): ArbitraryKey => {
  switch (arbitrary.type) {
    case `record`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        ...flatten(arbitrary.properties),
      ])
    case `dictionary`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.key,
        arbitrary.value,
      ])
    case `array`:
      return keyalesce([arbitrary.type, arbitrary.name, arbitrary.value])
    case `union`:
      return keyalesce([arbitrary.type, arbitrary.name, ...arbitrary.variants])
    case `enum`:
      return keyalesce([arbitrary.type, arbitrary.name, ...arbitrary.values])
    case `number`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.min,
        arbitrary.max,
      ])
    case `bigint`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.min,
        arbitrary.max,
      ])
    case `bytes`:
      return keyalesce([arbitrary.type, arbitrary.name])
    case `string`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.minLength,
        arbitrary.maxLength,
      ])
    case `boolean`:
      return keyalesce([arbitrary.type, arbitrary.name])
    case `null`:
      return keyalesce([arbitrary.type, arbitrary.name])
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
              map((dependency): [Arbitrary, Arbitrary] => [
                arbitrary,
                dependency,
              ]),
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
    case `record`:
      return new Set(values(arbitrary.properties))
    case `dictionary`:
      return new Set([arbitrary.key, arbitrary.value])
    case `array`:
      return new Set([arbitrary.value])
    case `union`:
      return new Set(arbitrary.variants)
    case `enum`:
    case `number`:
    case `bigint`:
    case `bytes`:
    case `string`:
    case `boolean`:
    case `null`:
      return new Set()
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
