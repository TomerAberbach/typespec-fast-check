/* eslint-disable new-cap */
import {
  entries,
  filter,
  get,
  map,
  minBy,
  pipe,
  reduce,
  toArray,
  toMap,
} from 'lfi'
import * as ay from '@alloy-js/core/stc'
import * as ts from '@alloy-js/typescript/stc'
import { join as ayJoin, code, refkey } from '@alloy-js/core'
import type { Child, Children } from '@alloy-js/core'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ArrayArbitrary,
  BigIntArbitrary,
  BytesArbitrary,
  DictionaryArbitrary,
  EnumArbitrary,
  MergedArbitrary,
  NumberArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  StringArbitrary,
  UnionArbitrary,
} from './arbitrary.ts'
import { fastCheckNumerics } from './numerics.ts'

const ArbitraryFile = ({
  namespace,
  sharedArbitraries,
}: {
  namespace: ArbitraryNamespace
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child =>
  ay.Output().children(ts.SourceFile({ path: `arbitraries.js` }).code`
    import * as fc from 'fast-check';

    ${GlobalArbitraryNamespace({ namespace, sharedArbitraries })}
  `)

const GlobalArbitraryNamespace = ({
  namespace,
  sharedArbitraries,
}: {
  namespace: ArbitraryNamespace
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child =>
  ayJoin(
    [
      ...map(
        arbitrary =>
          ts.VarDeclaration({
            export: namespace.arbitraryToName.has(arbitrary),
            const: true,
            name: namespace.arbitraryToName.get(arbitrary) ?? arbitrary.name,
            refkey: refkey(arbitrary),
            value: ArbitraryDefinition({ arbitrary, sharedArbitraries }),
          }),
        sharedArbitraries,
      ),
      ...map(
        namespace =>
          ts.VarDeclaration({
            export: true,
            const: true,
            name: namespace.name,
            value: NestedArbitraryNamespace({ namespace, sharedArbitraries }),
          }),
        namespace.namespaces,
      ),
      ...pipe(
        entries(namespace.nameToArbitrary),
        filter(([, arbitrary]) => !sharedArbitraries.has(arbitrary)),
        map(([name, arbitrary]) =>
          ts.VarDeclaration({
            export: true,
            const: true,
            name,
            value: Arbitrary({ arbitrary, sharedArbitraries }),
          }),
        ),
      ),
    ],
    { joiner: `\n\n` },
  )

const NestedArbitraryNamespace = ({
  namespace,
  sharedArbitraries,
}: {
  namespace: ArbitraryNamespace
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child =>
  ts.ObjectExpression().children(
    ayJoin(
      [
        ...map(
          namespace =>
            ts.ObjectProperty({
              name: namespace.name,
              value: code`${NestedArbitraryNamespace({ namespace, sharedArbitraries })},`,
            }),
          namespace.namespaces,
        ),
        ...map(
          ([name, arbitrary]) =>
            ts.ObjectProperty({
              name,
              value: code`${Arbitrary({ arbitrary, sharedArbitraries })},`,
            }),
          entries(namespace.nameToArbitrary),
        ),
      ],
      { joiner: `\n\n` },
    ),
  )

const Arbitrary = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: Arbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child =>
  arbitrary.type === `reference` && sharedArbitraries.has(arbitrary)
    ? refkey(arbitrary)
    : ArbitraryDefinition({ arbitrary, sharedArbitraries })

const ArbitraryDefinition = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: Arbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child => {
  switch (arbitrary.type) {
    case `null`:
      return NullArbitrary()
    case `undefined`:
      return UndefinedArbitrary()
    case `never`:
      return NeverArbitrary()
    case `unknown`:
      return UnknownArbitrary()
    case `boolean`:
      return BooleanArbitrary()
    case `number`:
      return NumberArbitrary({ arbitrary })
    case `bigint`:
      return BigIntArbitrary({ arbitrary })
    case `string`:
      return StringArbitrary({ arbitrary })
    case `bytes`:
      return BytesArbitrary()
    case `enum`:
      return EnumArbitrary({ arbitrary })
    case `array`:
      return ArrayArbitrary({ arbitrary, sharedArbitraries })
    case `dictionary`:
      return DictionaryArbitrary({ arbitrary, sharedArbitraries })
    case `union`:
      return UnionArbitrary({ arbitrary, sharedArbitraries })
    case `record`:
      return RecordArbitrary({ arbitrary, sharedArbitraries })
    case `merged`:
      return MergedArbitrary({ arbitrary, sharedArbitraries })
    case `reference`:
      return Arbitrary({ arbitrary: arbitrary.arbitrary, sharedArbitraries })
  }
}

const NullArbitrary = (): Child => code`fc.constant(null)`

const UndefinedArbitrary = (): Child => code`fc.constant(undefined)`

const NeverArbitrary = (): Child => code`
  fc.constant(null).map(() => {
    throw new Error('never');
  })
`

const UnknownArbitrary = (): Child => code`fc.anything()`

const BooleanArbitrary = (): Child => code`fc.boolean()`

const NumberArbitrary = ({
  arbitrary,
}: {
  arbitrary: NumberArbitrary
}): Child => {
  const [name, { min, max }] = pipe(
    entries(fastCheckNumerics),
    filter(
      ([, { isInteger, min, max }]) =>
        arbitrary.isInteger === isInteger &&
        (arbitrary.min === min.value ||
          min.configurable === true ||
          (min.configurable === `higher` && arbitrary.min >= min.value)) &&
        (arbitrary.max === max.value ||
          max.configurable === true ||
          (max.configurable === `lower` && arbitrary.max <= max.value)),
    ),
    minBy(([, a], [, b]) => {
      const matchCount1 =
        Number(arbitrary.min === a.min.value) +
        Number(arbitrary.max === a.max.value)
      const matchCount2 =
        Number(arbitrary.min === b.min.value) +
        Number(arbitrary.max === b.max.value)
      if (matchCount1 !== matchCount2) {
        return matchCount2 - matchCount1
      }

      const delta1 =
        Math.abs(arbitrary.min - a.min.value) +
        Math.abs(arbitrary.max - a.max.value)
      const delta2 =
        Math.abs(arbitrary.min - b.min.value) +
        Math.abs(arbitrary.max - b.max.value)
      return delta1 - delta2
    }),
    get,
  )

  let arbitraryMin = arbitrary.min === min.value ? null : arbitrary.min
  if (arbitraryMin !== null && min.normalize) {
    arbitraryMin = min.normalize(arbitraryMin)
  }

  let arbitraryMax = arbitrary.max === max.value ? null : arbitrary.max
  if (arbitraryMax !== null && max.normalize) {
    arbitraryMax = max.normalize(arbitraryMax)
  }

  return code`fc.${name}(${Options({
    properties: new Map([
      [`min`, arbitraryMin],
      [`max`, arbitraryMax],
    ]),
  })})`
}

const BigIntArbitrary = ({
  arbitrary,
}: {
  arbitrary: BigIntArbitrary
}): Child =>
  code`fc.bigInt(${Options({
    properties: new Map([
      [`min`, arbitrary.min == null ? null : `${arbitrary.min}n`],
      [`max`, arbitrary.max == null ? null : `${arbitrary.max}n`],
    ]),
  })})`

const StringArbitrary = ({
  arbitrary,
}: {
  arbitrary: StringArbitrary
}): Child =>
  code`fc.string(${Options({
    properties: new Map([
      [`minLength`, arbitrary.minLength],
      [`maxLength`, arbitrary.maxLength],
    ]),
  })})`

const BytesArbitrary = (): Child => code`fc.uint8Array()`

const EnumArbitrary = ({ arbitrary }: { arbitrary: EnumArbitrary }): Child =>
  code`fc.constantFrom(${arbitrary.values.join(`, `)})`

const ArrayArbitrary = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: ArrayArbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child => {
  const options = Options({
    properties: new Map([
      [`minLength`, arbitrary.minItems],
      [`maxLength`, arbitrary.maxItems],
    ]),
  })

  return code`fc.array(${Arbitrary({
    arbitrary: arbitrary.value,
    sharedArbitraries,
  })}${options ? code`, ${options}` : ``})`
}

const DictionaryArbitrary = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: DictionaryArbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child => {
  const Key = Arbitrary({ arbitrary: arbitrary.key, sharedArbitraries })
  const Value = Arbitrary({ arbitrary: arbitrary.value, sharedArbitraries })
  return code`fc.dictionary(${Key}, ${Value})`
}

const UnionArbitrary = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: UnionArbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child =>
  code`fc.oneof(\n${ay
    .Indent()
    .children(
      ayJoin(
        arbitrary.variants.map(
          variant =>
            code`${Arbitrary({ arbitrary: variant, sharedArbitraries })},`,
        ),
      ),
    )}\n)`

const RecordArbitrary = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: RecordArbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child =>
  code`fc.record(${Options({
    properties: pipe(
      arbitrary.properties,
      map(([name, arbitrary]) => [
        name,
        Arbitrary({ arbitrary, sharedArbitraries }),
      ]),
      reduce(toMap()),
    ),
    emitEmpty: true,
  })})`

const MergedArbitrary = ({
  arbitrary,
  sharedArbitraries,
}: {
  arbitrary: MergedArbitrary
  sharedArbitraries: ReadonlySet<ReferenceArbitrary>
}): Child => code`
  fc
    .tuple(
      ${ayJoin(
        arbitrary.arbitraries.map(
          arbitrary => code`${Arbitrary({ arbitrary, sharedArbitraries })},`,
        ),
        { joiner: `\n` },
      )}
    )
    .map(values => Object.assign(...values))
`

const Options = ({
  properties,
  emitEmpty = false,
}: {
  properties: Map<string, Children>
  emitEmpty?: boolean
}) => {
  const filteredProperties = pipe(
    properties,
    filter(([, value]) => value != null),
    reduce(toMap()),
  )
  if (filteredProperties.size === 0 && !emitEmpty) {
    return ``
  }

  return ts.ObjectExpression().children(
    ayJoin(
      pipe(
        filteredProperties,
        map(
          ([name, value]) =>
            code`${ts.ObjectProperty({
              name,
              // https://github.com/alloy-framework/alloy/issues/42
              value: typeof value === `number` ? String(value) : value,
            })},\n`,
        ),
        reduce(toArray()),
      ),
    ),
  )
}

export default ArbitraryFile
