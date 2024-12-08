export type ArbitraryNamespace = {
  name: string
  namespaces: ArbitraryNamespace[]
  nameToArbitrary: Map<string, ReferenceArbitrary>
  arbitraryToName: Map<ReferenceArbitrary, string>
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
  | ReferenceArbitrary

export type IntrinsicArbitrary =
  | NullArbitrary
  | UndefinedArbitrary
  | NeverArbitrary
  | UnknownArbitrary
export type NullArbitrary = { type: `null` }
export type UndefinedArbitrary = { type: `undefined` }
export type NeverArbitrary = { type: `never` }
export type UnknownArbitrary = { type: `unknown` }

export type ScalarArbitrary =
  | BooleanArbitrary
  | NumberArbitrary
  | BigIntArbitrary
  | StringArbitrary
  | BytesArbitrary
export type BooleanArbitrary = {
  type: `boolean`
}
export type NumberArbitrary = {
  type: `number`
  min: number
  max: number
  isInteger: boolean
}
export type BigIntArbitrary = {
  type: `bigint`
  min?: bigint
  max?: bigint
}
export type StringArbitrary = {
  type: `string`
  minLength?: number
  maxLength?: number
}
export type BytesArbitrary = {
  type: `bytes`
}

export type EnumArbitrary = {
  type: `enum`
  values: string[]
}

export type ArrayArbitrary = {
  type: `array`
  value: Arbitrary
  minItems?: number
  maxItems?: number
}

export type DictionaryArbitrary = {
  type: `dictionary`
  key: Arbitrary
  value: Arbitrary
}

export type UnionArbitrary = {
  type: `union`
  variants: Arbitrary[]
}

export type RecordArbitrary = {
  type: `record`
  properties: Map<string, Arbitrary>
}

export type MergedArbitrary = {
  type: `merged`
  arbitraries: Arbitrary[]
}

export type ReferenceArbitrary = {
  type: `reference`
  name: string
  arbitrary: Arbitrary
}
