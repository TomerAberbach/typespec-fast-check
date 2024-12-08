export type ArbitraryNamespace = {
  name: string
  namespaces: ArbitraryNamespace[]
  nameToArbitrary: Map<string, Arbitrary>
  arbitraryToName: Map<Arbitrary, string>
}

export type Arbitrary =
  | IntrinsicArbitrary
  | ScalarArbitrary
  | EnumArbitrary
  | ArrayArbitrary
  | DictionaryArbitrary
  | UnionArbitrary
  | RecordArbitrary
  | MergedArbitrary

export type BaseArbitrary = {
  name: string
}

export type IntrinsicArbitrary =
  | NullArbitrary
  | UndefinedArbitrary
  | NeverArbitrary
  | UnknownArbitrary
export type NullArbitrary = BaseArbitrary & {
  type: `null`
}
export type UndefinedArbitrary = BaseArbitrary & {
  type: `undefined`
}
export type NeverArbitrary = BaseArbitrary & {
  type: `never`
}
export type UnknownArbitrary = BaseArbitrary & {
  type: `unknown`
}

export type ScalarArbitrary =
  | BooleanArbitrary
  | NumberArbitrary
  | BigIntArbitrary
  | StringArbitrary
  | BytesArbitrary
export type BooleanArbitrary = BaseArbitrary & {
  type: `boolean`
}
export type NumberArbitrary = BaseArbitrary & {
  type: `number`
  min: number
  max: number
  isInteger: boolean
}
export type BigIntArbitrary = BaseArbitrary & {
  type: `bigint`
  min?: bigint
  max?: bigint
}
export type StringArbitrary = BaseArbitrary & {
  type: `string`
  minLength?: number
  maxLength?: number
}
export type BytesArbitrary = BaseArbitrary & {
  type: `bytes`
}

export type EnumArbitrary = BaseArbitrary & {
  type: `enum`
  values: string[]
}

export type ArrayArbitrary = BaseArbitrary & {
  type: `array`
  value: Arbitrary
  minItems?: number
  maxItems?: number
}

export type DictionaryArbitrary = BaseArbitrary & {
  type: `dictionary`
  key: Arbitrary
  value: Arbitrary
}

export type UnionArbitrary = BaseArbitrary & {
  type: `union`
  variants: Arbitrary[]
}

export type RecordArbitrary = BaseArbitrary & {
  type: `record`
  properties: Map<string, Arbitrary>
}

export type MergedArbitrary = BaseArbitrary & {
  type: `merged`
  arbitraries: Arbitrary[]
}
