export type ArbitraryNamespace = {
  name: string
  namespaces: ArbitraryNamespace[]
  nameToArbitrary: Map<string, Arbitrary>
  arbitraryToName: Map<Arbitrary, string>
}

export type Arbitrary = BaseArbitrary &
  (
    | NullArbitrary
    | UndefinedArbitrary
    | BooleanArbitrary
    | NumberArbitrary
    | BigIntArbitrary
    | StringArbitrary
    | BytesArbitrary
    | EnumArbitrary
    | ArrayArbitrary
    | DictionaryArbitrary
    | UnionArbitrary
    | RecordArbitrary
  )

export type BaseArbitrary = {
  name: string
}

export type NullArbitrary = {
  type: `null`
}

export type UndefinedArbitrary = {
  type: `undefined`
}

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
