export type ArbitraryNamespace = {
  name: string
  namespaces: ArbitraryNamespace[]
  nameToArbitrary: Map<string, ReferenceArbitrary>
  arbitraryToName: Map<ReferenceArbitrary, string>
}

export type Arbitrary =
  | NeverArbitrary
  | AnythingArbitrary
  | ConstantArbitrary
  | ScalarArbitrary
  | EnumArbitrary
  | ArrayArbitrary
  | DictionaryArbitrary
  | UnionArbitrary
  | RecordArbitrary
  | IntersectionArbitrary
  | ReferenceArbitrary

export type NeverArbitrary = { type: `never` }

export type AnythingArbitrary = { type: `anything` }

export type ConstantArbitrary = {
  type: `constant`
  value: unknown
}

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
  values: unknown[]
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
  properties: Map<string, { arbitrary: Arbitrary; required: boolean }>
}

export type IntersectionArbitrary = {
  type: `intersection`
  arbitraries: Arbitrary[]
}

export type ReferenceArbitrary = {
  type: `reference`
  name: string
  arbitrary: Arbitrary
}
