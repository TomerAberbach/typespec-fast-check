import keyalesce from 'keyalesce'
import { flatMap } from 'lfi'

export type ArbitraryNamespace = {
  name: string
  comment?: string
  namespaces: ArbitraryNamespace[]
  nameToArbitrary: Map<string, ReferenceArbitrary>
  arbitraryToName: Map<ReferenceArbitrary, string>
}

export type Arbitrary =
  | NeverArbitrary
  | AnythingArbitrary
  | ConstantArbitrary
  | ScalarArbitrary
  | OptionArbitrary
  | EnumArbitrary
  | ArrayArbitrary
  | TupleArbitrary
  | DictionaryArbitrary
  | UnionArbitrary
  | RecordArbitrary
  | IntersectionArbitrary
  | ReferenceArbitrary
  | RecursiveReferenceArbitrary
  | FunctionDeclarationArbitrary
  | ParameterReferenceArbitrary
  | FunctionCallArbitrary

export const neverArbitrary = (): NeverArbitrary => memoize({ type: `never` })

export type NeverArbitrary = { type: `never` }

export const anythingArbitrary = (): AnythingArbitrary =>
  memoize({ type: `anything` })

export type AnythingArbitrary = { type: `anything` }

export const constantArbitrary = (value: unknown): ConstantArbitrary =>
  memoize({ type: `constant`, value })

export type ConstantArbitrary = {
  type: `constant`
  value: unknown
}

export const booleanArbitrary = (): BooleanArbitrary =>
  memoize({ type: `boolean` })

export type BooleanArbitrary = {
  type: `boolean`
}

export const numberArbitrary = (
  options: Omit<NumberArbitrary, `type`>,
): NumberArbitrary => memoize({ ...options, type: `number` })

export type NumberArbitrary = {
  type: `number`
  min: {
    value: number
    exclusive: boolean
  }
  max: {
    value: number
    exclusive: boolean
  }
  isInteger: boolean
}

export const bigintArbitrary = (
  options: Omit<BigIntArbitrary, `type`>,
): BigIntArbitrary => memoize({ ...options, type: `bigint` })

export type BigIntArbitrary = {
  type: `bigint`
  min?: bigint
  max?: bigint
}

export const stringArbitrary = (
  options: Omit<StringArbitrary, `type`>,
): StringArbitrary => memoize({ ...options, type: `string` })

export type StringArbitrary = {
  type: `string`
  minLength?: number
  maxLength?: number
  pattern?: string
}

export const urlArbitrary = (): UrlArbitrary => memoize({ type: `url` })

export type UrlArbitrary = { type: `url` }

export const bytesArbitrary = (
  options: Omit<BytesArbitrary, `type`>,
): BytesArbitrary => memoize({ ...options, type: `bytes` })

export type BytesArbitrary = {
  type: `bytes`
  encoding: `binary` | `base64`
}

export type ScalarArbitrary =
  | BooleanArbitrary
  | NumberArbitrary
  | BigIntArbitrary
  | StringArbitrary
  | UrlArbitrary
  | BytesArbitrary

export const optionArbitrary = (arbitrary: Arbitrary): OptionArbitrary =>
  memoize({ type: `option`, arbitrary })

export type OptionArbitrary = {
  type: `option`
  arbitrary: Arbitrary
}

export const enumArbitrary = (members: unknown[]): EnumArbitrary =>
  memoize({ type: `enum`, members })

export type EnumArbitrary = {
  type: `enum`
  members: unknown[]
}

export const arrayArbitrary = (
  value: Arbitrary,
  options: Omit<ArrayArbitrary, `type` | `value`>,
): ArrayArbitrary => memoize({ ...options, type: `array`, value })

export type ArrayArbitrary = {
  type: `array`
  value: Arbitrary
  minItems?: number
  maxItems?: number
}

export const tupleArbitrary = (arbitraries: Arbitrary[]): TupleArbitrary =>
  memoize({ type: `tuple`, arbitraries })

export type TupleArbitrary = {
  type: `tuple`
  arbitraries: Arbitrary[]
}

export const dictionaryArbitrary = (
  key: Arbitrary,
  value: Arbitrary,
): DictionaryArbitrary => memoize({ type: `dictionary`, key, value })

export type DictionaryArbitrary = {
  type: `dictionary`
  key: Arbitrary
  value: Arbitrary
}

export const unionArbitrary = (variants: Arbitrary[]): UnionArbitrary =>
  memoize({ type: `union`, variants })

export type UnionArbitrary = {
  type: `union`
  variants: Arbitrary[]
}

export const recordArbitrary = (
  properties: RecordArbitrary[`properties`],
): RecordArbitrary => memoize({ type: `record`, properties })

export type RecordArbitrary = {
  type: `record`
  properties: Map<
    string,
    {
      arbitrary: Arbitrary
      comment?: string
      required: boolean
    }
  >
}

export const intersectionArbitrary = (
  arbitraries: Arbitrary[],
): IntersectionArbitrary => memoize({ type: `intersection`, arbitraries })

export type IntersectionArbitrary = {
  type: `intersection`
  arbitraries: Arbitrary[]
}

export const referenceArbitrary = (
  options: Omit<ReferenceArbitrary, `type`>,
): ReferenceArbitrary => memoize({ ...options, type: `reference` })

export type ReferenceArbitrary = {
  type: `reference`
  name: string
  comment?: string
  arbitrary: Arbitrary
}

export const recursiveReferenceArbitrary = (
  deref: () => ReferenceArbitrary,
): RecursiveReferenceArbitrary =>
  memoize({ type: `recursive-reference`, deref })

export type RecursiveReferenceArbitrary = {
  type: `recursive-reference`
  deref: () => ReferenceArbitrary
}

export const functionDeclarationArbitrary = (
  options: Omit<FunctionDeclarationArbitrary, `type`>,
): FunctionDeclarationArbitrary =>
  memoize({ ...options, type: `function-declaration` })

export type FunctionDeclarationArbitrary = {
  type: `function-declaration`
  parameters: string[]
  arbitrary: Arbitrary
}

export const parameterReferenceArbitrary = (
  name: string,
): ParameterReferenceArbitrary => memoize({ type: `parameter-reference`, name })

export type ParameterReferenceArbitrary = {
  type: `parameter-reference`
  name: string
}

export const functionCallArbitrary = (
  options: Omit<FunctionCallArbitrary, `type`>,
): FunctionCallArbitrary => memoize({ ...options, type: `function-call` })

export type FunctionCallArbitrary = {
  type: `function-call`
  name: string
  args: Arbitrary[]
}

const memoize = <A extends Arbitrary>(arbitrary: A): A => {
  const arbitraryKey = getArbitraryKey(arbitrary)
  let cachedArbitrary = arbitraryCache.get(arbitraryKey)
  if (!cachedArbitrary) {
    cachedArbitrary = arbitrary
    arbitraryCache.set(arbitraryKey, cachedArbitrary)
  }
  return cachedArbitrary as A
}

const getArbitraryKey = (arbitrary: Arbitrary): ArbitraryKey => {
  switch (arbitrary.type) {
    case `never`:
    case `anything`:
    case `boolean`:
    case `url`:
      return keyalesce([arbitrary.type])
    case `constant`:
      return keyalesce([arbitrary.type, arbitrary.value])
    case `number`:
      return keyalesce([
        arbitrary.type,
        arbitrary.min.value,
        arbitrary.min.exclusive,
        arbitrary.max.value,
        arbitrary.max.exclusive,
      ])
    case `bigint`:
      return keyalesce([arbitrary.type, arbitrary.min, arbitrary.max])
    case `string`:
      return keyalesce([
        arbitrary.type,
        arbitrary.minLength,
        arbitrary.maxLength,
        arbitrary.pattern,
      ])
    case `bytes`:
      return keyalesce([arbitrary.type, arbitrary.encoding])
    case `option`:
      return keyalesce([arbitrary.type, arbitrary.arbitrary])
    case `enum`:
      return keyalesce([arbitrary.type, ...arbitrary.members])
    case `array`:
      return keyalesce([
        arbitrary.type,
        arbitrary.value,
        arbitrary.minItems,
        arbitrary.maxItems,
      ])
    case `tuple`:
      return keyalesce([arbitrary.type, ...arbitrary.arbitraries])
    case `dictionary`:
      return keyalesce([arbitrary.type, arbitrary.key, arbitrary.value])
    case `union`:
      return keyalesce([arbitrary.type, ...arbitrary.variants])
    case `record`:
      return keyalesce([
        arbitrary.type,
        ...flatMap(
          ([name, { arbitrary, comment, required }]) => [
            name,
            arbitrary,
            comment,
            required,
          ],
          arbitrary.properties,
        ),
      ])
    case `intersection`:
      return keyalesce([arbitrary.type, ...arbitrary.arbitraries])
    case `reference`:
      return keyalesce([
        arbitrary.type,
        arbitrary.name,
        arbitrary.comment,
        arbitrary.arbitrary,
      ])
    case `recursive-reference`:
      return keyalesce([arbitrary.type, arbitrary.deref])
    case `function-declaration`:
      return keyalesce([
        arbitrary.type,
        ...arbitrary.parameters,
        arbitrary.arbitrary,
      ])
    case `parameter-reference`:
      return keyalesce([arbitrary.type, arbitrary.name])
    case `function-call`:
      return keyalesce([arbitrary.type, arbitrary.name, ...arbitrary.args])
  }
}

const arbitraryCache = new Map<ArbitraryKey, Arbitrary>()
type ArbitraryKey = ReturnType<typeof keyalesce>
