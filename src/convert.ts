/* eslint-disable typescript/prefer-nullish-coalescing */
import {
  getMaxLengthAsNumeric,
  getMaxValueAsNumeric,
  getMinLengthAsNumeric,
  getMinValueAsNumeric,
} from '@typespec/compiler'
import type {
  Enum,
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
  const name = options.propertyName || scalar.name || `Scalar`
  switch (scalar.name) {
    case `boolean`:
      return memoize({ type: `boolean`, name })
    case `int8`:
      return convertInteger(scalar, options, { min: -128, max: 127 })
    case `int16`:
      return convertInteger(scalar, options, { min: -32_768, max: 32_767 })
    case `int32`:
      return convertInteger(scalar, options, {
        min: -2_147_483_648,
        max: 2_147_483_647,
      })
    case `int64`:
      return convertBigint(scalar, options, {
        min: -9_223_372_036_854_775_808n,
        max: 9_223_372_036_854_775_807n,
      })
    case `integer`:
      return convertBigint(scalar, options)
    case `float32`:
      return convertFloat(scalar, options)
    case `float64`:
    case `float`:
    case `decimal128`:
    case `decimal`:
    case `numeric`:
      return convertDouble(scalar, options)
    case `string`:
      return convertString(scalar, options)
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

const convertInteger = (
  integer: Scalar,
  { constraints }: ConvertTypeOptions,
  { min, max }: { min: number; max: number },
): Arbitrary =>
  memoize({
    type: `integer`,
    name: integer.name,
    min: maxOrUndefined(constraints.min?.asNumber() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asNumber() ?? undefined, max),
  })

const convertBigint = (
  integer: Scalar,
  { constraints }: ConvertTypeOptions,
  { min, max }: { min?: bigint; max?: bigint } = {},
): Arbitrary =>
  memoize({
    type: `big-integer`,
    name: integer.name,
    min: maxOrUndefined(constraints.min?.asBigInt() ?? undefined, min),
    max: minOrUndefined(constraints.max?.asBigInt() ?? undefined, max),
  })

const convertFloat = (
  float: Scalar,
  { constraints }: ConvertTypeOptions,
): Arbitrary => {
  let min = constraints.min?.asNumber() ?? undefined
  if (min !== undefined && min < -3.4e38) {
    min = undefined
  }

  let max = constraints.max?.asNumber() ?? undefined
  if (max !== undefined && max > 3.4e38) {
    max = undefined
  }

  return memoize({ type: `float`, name: float.name, min, max })
}

const convertDouble = (
  double: Scalar,
  { constraints }: ConvertTypeOptions,
): Arbitrary =>
  memoize({
    type: `double`,
    name: double.name,
    min: constraints.min?.asNumber() ?? undefined,
    max: constraints.max?.asNumber() ?? undefined,
  })

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
    case `boolean`:
      return keyalesce([arbitrary.type, arbitrary.name])
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
    case `integer`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.min,
        arbitrary.max,
      ])
    case `big-integer`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.min,
        arbitrary.max,
      ])
    case `float`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.min,
        arbitrary.max,
      ])
    case `double`:
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
    case `boolean`:
    case `integer`:
    case `big-integer`:
    case `float`:
    case `double`:
    case `string`:
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
