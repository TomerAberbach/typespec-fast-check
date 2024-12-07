export type ArbitraryNamespace = {
  name: string
  namespaces: ArbitraryNamespace[]
  nameToArbitrary: Map<string, Arbitrary>
  arbitraryToName: Map<Arbitrary, string>
}

export type Arbitrary = BaseArbitrary &
  (
    | RecordArbitrary
    | DictionaryArbitrary
    | ArrayArbitrary
    | UnionArbitrary
    | EnumArbitrary
    | NumberArbitrary
    | BigIntArbitrary
    | BytesArbitrary
    | StringArbitrary
    | BooleanArbitrary
    | NullArbitrary
  )

export type BaseArbitrary = {
  name: string
}

export type RecordArbitrary = {
  type: `record`
  properties: Map<string, Arbitrary>
}

export type DictionaryArbitrary = {
  type: `dictionary`
  key: Arbitrary
  value: Arbitrary
}

export type ArrayArbitrary = {
  type: `array`
  value: Arbitrary
}

export type UnionArbitrary = {
  type: `union`
  variants: Arbitrary[]
}

export type EnumArbitrary = {
  type: `enum`
  values: string[]
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

export type BytesArbitrary = {
  type: `bytes`
}

export type StringArbitrary = {
  type: `string`
  minLength?: number
  maxLength?: number
}

export type BooleanArbitrary = {
  type: `boolean`
}

export type NullArbitrary = {
  type: `null`
}
