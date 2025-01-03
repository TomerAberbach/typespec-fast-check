import assert from 'node:assert'
import { getDoc, isTemplateDeclaration } from '@typespec/compiler'
import type {
  BooleanLiteral,
  Enum,
  IntrinsicType,
  Model,
  ModelIndexer,
  ModelProperty,
  Namespace,
  NumericLiteral,
  ObjectType,
  Program,
  Scalar,
  StringLiteral,
  TemplateParameter,
  TemplatedType,
  Tuple,
  Type,
  Union,
  Value,
} from '@typespec/compiler'
import {
  any,
  concat,
  entries,
  filter,
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
import camelcase from 'camelcase'
import {
  anythingArbitrary,
  arrayArbitrary,
  bigintArbitrary,
  booleanArbitrary,
  bytesArbitrary,
  constantArbitrary,
  dictionaryArbitrary,
  enumArbitrary,
  functionCallArbitrary,
  functionDeclarationArbitrary,
  intersectionArbitrary,
  neverArbitrary,
  numberArbitrary,
  parameterReferenceArbitrary,
  recordArbitrary,
  recursiveReferenceArbitrary,
  referenceArbitrary,
  stringArbitrary,
  tupleArbitrary,
  unionArbitrary,
  urlArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ArrayArbitrary,
  BytesArbitrary,
  ConstantArbitrary,
  DictionaryArbitrary,
  ParameterReferenceArbitrary,
  RecordArbitrary,
  StringArbitrary,
} from './arbitrary.ts'
import {
  fastCheckNumerics,
  maxOfMinBounds,
  minOfMaxBounds,
  numerics,
} from './numerics.ts'
import type { Bound } from './numerics.ts'
import normalizeArbitrary from './normalize.ts'
import { collectSharedArbitraries } from './dependency-graph.ts'
import type { SharedArbitraries } from './dependency-graph.ts'
import { getConstraints, mergeConstraints } from './constraints.ts'
import type { Constraints } from './constraints.ts'

const convertProgram = (
  program: Program,
): { namespace: ArbitraryNamespace; sharedArbitraries: SharedArbitraries } => {
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
      namespace.scalars,
      namespace.enums,
      namespace.unions,
      namespace.models,
      namespace.operations,
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
    comment: getDoc(program, namespace),
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
  constraints = mergeConstraints(constraints, getConstraints(program, type))
  const typeKey = keyalesce([type, constraints])
  let arbitrary = typeToArbitrary.get(typeKey)
  if (arbitrary) {
    return arbitrary
  }

  // If we try to convert the same type and constraints while converting the
  // type constraints, then we'll return a recursive reference above. Otherwise,
  // we'll return a non-recursive arbitrary by overwriting this entry below.
  typeToArbitrary.set(
    typeKey,
    recursiveReferenceArbitrary(() => {
      assert(arbitrary?.type === `reference`)
      return arbitrary
    }),
  )

  if (
    isTemplatedType(type) &&
    type.templateMapper &&
    !isTypeSpecNamespace(type.namespace)
  ) {
    return functionCallArbitrary({
      name: String(type.name),
      // eslint-disable-next-line array-callback-return
      args: type.templateMapper.args.map(arg => {
        switch (arg.entityKind) {
          case `Type`:
            return convertType(program, arg, constraints)
          case `Value`:
            return convertValue(arg)
          case `Indeterminate`:
            throw new Error(`Unhandled entity: ${arg.entityKind}`)
        }
      }),
    })
  }

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
      arbitrary = convertEnum(program, type)
      break
    case `Tuple`:
      arbitrary = convertTuple(program, type, constraints)
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
    case `ModelProperty`:
      arbitrary = convertType(program, type.type, constraints)
      break
    case `TemplateParameter`:
      arbitrary = convertTemplateParameter(type)
      break
    case `Operation`:
      throw new Error(`Unhandled type: ${type.kind}`)
    case `ScalarConstructor`:
    case `EnumMember`:
    case `UnionVariant`:
    case `Namespace`:
    case `Decorator`:
    case `Function`:
    case `FunctionParameter`:
    case `Interface`:
    case `Projection`:
    case `StringTemplate`:
    case `StringTemplateSpan`:
      throw new Error(`Unreachable: ${type.kind}`)
  }

  if (
    isTemplatedType(type) &&
    isTemplateDeclaration(type) &&
    !isTypeSpecNamespace(type.namespace)
  ) {
    assert(arbitrary.type === `reference`)
    arbitrary.arbitrary = functionDeclarationArbitrary({
      parameters: type.node.templateParameters.map(parameter =>
        camelcase(parameter.symbol.name),
      ),
      arbitrary: arbitrary.arbitrary,
    })
  }

  arbitrary = normalizeArbitrary(arbitrary)
  typeToArbitrary.set(typeKey, arbitrary)

  return arbitrary
}

const isTemplatedType = (type: Type): type is TemplatedType => {
  // eslint-disable-next-line typescript/switch-exhaustiveness-check
  switch (type.kind) {
    case `Scalar`:
    case `Union`:
    case `Model`:
    case `Interface`:
    case `Operation`:
      return true
    default:
      return false
  }
}

const typeToArbitrary = new Map<TypeKey, Arbitrary>()
type TypeKey = ReturnType<typeof keyalesce>

const convertIntrinsic = (intrinsic: IntrinsicType): Arbitrary => {
  switch (intrinsic.name) {
    case `null`:
      return constantArbitrary(null)
    case `void`:
      return constantArbitrary(undefined)
    case `never`:
      // Ref this because it's verbose so it's nice to extract a `const never`
      // variable if it's referenced more than once.
      return referenceArbitrary({ name: `never`, arbitrary: neverArbitrary() })
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
    case `boolean`:
      arbitrary = booleanArbitrary()
      break
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
    case `string`:
    case `plainDate`:
    case `plainTime`:
    case `utcDateTime`:
    case `offsetDateTime`:
    case `duration`:
      arbitrary = convertString(constraints)
      break
    case `url`:
      arbitrary = urlArbitrary()
      break
    case `bytes`:
      arbitrary = convertBytes(constraints)
      break
    default:
      if (scalar.baseScalar) {
        arbitrary = convertType(
          program,
          scalar.baseScalar,
          mergeConstraints(constraints, getConstraints(program, scalar)),
        )
      }
      break
  }

  if (!arbitrary) {
    throw new Error(`Unhandled Scalar: ${scalar.name}`)
  }

  return isTypeSpecNamespace(scalar.namespace)
    ? arbitrary
    : referenceArbitrary({
        name: scalar.name,
        comment: getDoc(program, scalar),
        arbitrary,
      })
}

const convertNumber = (
  scalar: Scalar,
  constraints: Constraints,
  { min, max, isInteger }: { min: number; max: number; isInteger: boolean },
): Arbitrary => {
  const minBound = [
    { value: constraints.min?.asNumber(), exclusive: false },
    { value: constraints.minExclusive?.asNumber(), exclusive: true },
    { value: min, exclusive: false },
  ]
    .filter((bound): bound is Bound<number> => bound.value != null)
    .reduce(maxOfMinBounds)
  const maxBound = [
    { value: constraints.max?.asNumber(), exclusive: false },
    { value: constraints.maxExclusive?.asNumber(), exclusive: true },
    { value: max, exclusive: false },
  ]
    .filter((bound): bound is Bound<number> => bound.value != null)
    .reduce(minOfMaxBounds)
  if (isInteger) {
    if (minBound.exclusive) {
      minBound.exclusive = false
      minBound.value++
    }
    if (maxBound.exclusive) {
      maxBound.exclusive = false
      maxBound.value--
    }
  }

  const arbitrary = numberArbitrary({ min: minBound, max: maxBound, isInteger })

  const hasDefaultConstraints =
    !arbitrary.min.exclusive &&
    arbitrary.min.value === min &&
    !arbitrary.max.exclusive &&
    arbitrary.max.value === max
  if (!hasDefaultConstraints) {
    return arbitrary
  }

  const matchesFastCheckNumeric = pipe(
    values(fastCheckNumerics),
    any(
      numeric =>
        !arbitrary.min.exclusive &&
        arbitrary.min.value === numeric.min.value &&
        !arbitrary.max.exclusive &&
        arbitrary.max.value === numeric.max.value &&
        arbitrary.isInteger === numeric.isInteger,
    ),
  )
  if (matchesFastCheckNumeric) {
    return arbitrary
  }

  return referenceArbitrary({ name: scalar.name, arbitrary })
}

const convertBigInt = (
  scalar: Scalar,
  constraints: Constraints,
  { min, max }: { min?: bigint; max?: bigint } = {},
): Arbitrary => {
  const minBounds = [
    { value: constraints.min?.asBigInt(), exclusive: false },
    { value: constraints.minExclusive?.asBigInt(), exclusive: true },
    { value: min, exclusive: false },
  ].filter((bound): bound is Bound<bigint> => bound.value != null)
  const minBound =
    minBounds.length === 0 ? undefined : minBounds.reduce(maxOfMinBounds)
  if (minBound?.exclusive) {
    minBound.value++
    minBound.exclusive = false
  }

  const maxBounds = [
    { value: constraints.max?.asBigInt(), exclusive: false },
    { value: constraints.maxExclusive?.asBigInt(), exclusive: true },
    { value: max, exclusive: false },
  ].filter((bound): bound is Bound<bigint> => bound.value != null)
  const maxBound =
    maxBounds.length === 0 ? undefined : maxBounds.reduce(minOfMaxBounds)
  if (maxBound?.exclusive) {
    maxBound.value--
    maxBound.exclusive = false
  }

  const arbitrary = bigintArbitrary({
    min: minBound?.value,
    max: maxBound?.value,
  })

  const hasDefaultConstraints =
    min !== undefined &&
    max !== undefined &&
    arbitrary.min === min &&
    arbitrary.max === max
  return hasDefaultConstraints
    ? referenceArbitrary({ name: scalar.name, arbitrary })
    : arbitrary
}

const convertString = (constraints: Constraints): StringArbitrary =>
  stringArbitrary({
    minLength: constraints.minLength?.asNumber() ?? undefined,
    maxLength: constraints.maxLength?.asNumber() ?? undefined,
    pattern: constraints.pattern,
  })

const convertBytes = (constraints: Constraints): BytesArbitrary => {
  let encoding: BytesArbitrary[`encoding`]
  switch (constraints.encodeData?.encoding) {
    case `base64`:
      encoding = `base64`
      break
    case undefined:
      encoding = `binary`
      break
    default:
      encoding = `binary`
      break
  }
  return bytesArbitrary({ encoding })
}

const convertEnum = (program: Program, $enum: Enum): Arbitrary =>
  referenceArbitrary({
    name: $enum.name,
    comment: getDoc(program, $enum),
    arbitrary: enumArbitrary(
      pipe(
        $enum.members,
        map(([, { name, value }]) => value ?? name),
        reduce(toArray()),
      ),
    ),
  })

const convertTuple = (
  program: Program,
  tuple: Tuple,
  constraints: Constraints,
): Arbitrary =>
  tupleArbitrary(
    tuple.values.map(type => convertType(program, type, constraints)),
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
        convertType(
          program,
          type,
          mergeConstraints(constraints, getConstraints(program, union)),
        ),
      ),
      reduce(toArray()),
    ),
  )
  return union.name
    ? referenceArbitrary({
        name: union.name,
        comment: getDoc(program, union),
        arbitrary,
      })
    : arbitrary
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
    arbitrary = convertType(
      program,
      baseModel,
      mergeConstraints(constraints, getConstraints(program, model)),
    )
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

  return isTypeSpecNamespace(model.namespace) || !model.name
    ? arbitrary
    : referenceArbitrary({
        name: model.name,
        comment: getDoc(program, model),
        arbitrary,
      })
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
        const arbitrary = convertType(
          program,
          property.type,
          mergeConstraints(constraints, getConstraints(program, property)),
        )
        const comment = getDoc(program, property)
        return [
          name,
          property.defaultValue
            ? {
                arbitrary: unionArbitrary([
                  arbitrary,
                  convertValue(property.defaultValue),
                ]),
                comment,
                required: false,
              }
            : { arbitrary, comment, required: !property.optional },
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

const convertTemplateParameter = (
  templateParameter: TemplateParameter,
): ParameterReferenceArbitrary =>
  parameterReferenceArbitrary(camelcase(templateParameter.node.symbol.name))

const isTypeSpecNamespace = (namespace?: Namespace): boolean =>
  namespace?.name === `TypeSpec`

export default convertProgram
