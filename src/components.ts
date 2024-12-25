/* eslint-disable new-cap */
import {
  entries,
  filter,
  first,
  get,
  join,
  keys,
  map,
  minBy,
  pipe,
  reduce,
  toArray,
  toMap,
  toObject,
  toSet,
} from 'lfi'
import * as ay from '@alloy-js/core/stc'
import * as ts from '@alloy-js/typescript/stc'
import {
  join as ayJoin,
  mapJoin as ayMapJoin,
  code,
  refkey,
} from '@alloy-js/core'
import type { Child, Children } from '@alloy-js/core'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ArrayArbitrary,
  BigIntArbitrary,
  BytesArbitrary,
  ConstantArbitrary,
  DictionaryArbitrary,
  EnumArbitrary,
  IntersectionArbitrary,
  NumberArbitrary,
  RecordArbitrary,
  ReferenceArbitrary,
  StringArbitrary,
  UnionArbitrary,
} from './arbitrary.ts'
import { fastCheckNumerics } from './numerics.ts'
import type { SharedArbitraries } from './dependency-graph.ts'

const ArbitraryFile = ({
  namespace,
  sharedArbitraries,
}: {
  namespace: ArbitraryNamespace
  sharedArbitraries: SharedArbitraries
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
  sharedArbitraries: SharedArbitraries
}): Child =>
  ayJoin(
    [
      ...map(arbitraries => {
        if (
          arbitraries.size === 1 &&
          !sharedArbitraries.recursivelyReferenced.has(get(first(arbitraries)))
        ) {
          const arbitrary = get(first(arbitraries))
          return ts.VarDeclaration({
            export: namespace.arbitraryToName.has(arbitrary),
            const: true,
            name: namespace.arbitraryToName.get(arbitrary) ?? arbitrary.name,
            refkey: refkey(arbitrary),
            value: ArbitraryDefinition({
              arbitrary,
              sharedArbitraries,
              activeArbitraryGroup: new Set(),
            }),
          })
        }

        const group = refkey()
        return ayJoin(
          [
            ts.VarDeclaration({
              const: true,
              name: `group`,
              refkey: group,
              value: code`fc.letrec(tie => (${ObjectExpression({
                properties: pipe(
                  arbitraries,
                  map(arbitrary => [
                    arbitrary.name,
                    ArbitraryDefinition({
                      arbitrary,
                      sharedArbitraries,
                      activeArbitraryGroup: arbitraries,
                    }),
                  ]),
                  reduce(toObject()),
                ),
              })}))`,
            }),
            ...pipe(
              arbitraries,
              map(arbitrary =>
                ts.VarDeclaration({
                  export: namespace.arbitraryToName.has(arbitrary),
                  const: true,
                  name:
                    namespace.arbitraryToName.get(arbitrary) ?? arbitrary.name,
                  refkey: refkey(arbitrary),
                  value: code`${group}.${arbitrary.name}`,
                }),
              ),
              reduce(toArray()),
            ),
          ],
          { joiner: `\n` },
        )
      }, sharedArbitraries.stronglyConnected),
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
        filter(([, arbitrary]) => !sharedArbitraries.all.has(arbitrary)),
        map(([name, arbitrary]) =>
          ts.VarDeclaration({
            export: true,
            const: true,
            name,
            value: Arbitrary({
              arbitrary,
              sharedArbitraries,
              activeArbitraryGroup: new Set(),
            }),
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
  sharedArbitraries: SharedArbitraries
}): Child => {
  if (
    namespace.namespaces.length === 0 &&
    namespace.nameToArbitrary.size === 0
  ) {
    return `{}`
  }

  return ts.ObjectExpression().children(
    ayJoin(
      [
        ...map(
          namespace =>
            ts.ObjectProperty({
              name: namespace.name,
              value: code`${NestedArbitraryNamespace({
                namespace,
                sharedArbitraries,
              })},`,
            }),
          namespace.namespaces,
        ),
        ...map(
          ([name, arbitrary]) =>
            ts.ObjectProperty({
              name,
              value: code`${Arbitrary({
                arbitrary,
                sharedArbitraries,
                activeArbitraryGroup: new Set(),
              })},`,
            }),
          entries(namespace.nameToArbitrary),
        ),
      ],
      { joiner: `\n\n` },
    ),
  )
}

const Arbitrary = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: Arbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child => {
  if (arbitrary.type !== `reference`) {
    return ArbitraryDefinition({
      arbitrary,
      sharedArbitraries,
      activeArbitraryGroup,
    })
  }

  if (activeArbitraryGroup.has(arbitrary)) {
    return code`tie(${StringLiteral({ string: arbitrary.name })})`
  }

  if (sharedArbitraries.all.has(arbitrary)) {
    return refkey(arbitrary)
  }

  return ArbitraryDefinition({
    arbitrary,
    sharedArbitraries,
    activeArbitraryGroup,
  })
}

const ArbitraryDefinition = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: Arbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child => {
  switch (arbitrary.type) {
    case `never`:
      return NeverArbitrary()
    case `anything`:
      return AnythingArbitrary()
    case `constant`:
      return ConstantArbitrary({ arbitrary })
    case `boolean`:
      return BooleanArbitrary()
    case `number`:
      return NumberArbitrary({ arbitrary })
    case `bigint`:
      return BigIntArbitrary({ arbitrary })
    case `string`:
      return StringArbitrary({ arbitrary })
    case `url`:
      return UrlArbitrary()
    case `bytes`:
      return BytesArbitrary()
    case `enum`:
      return EnumArbitrary({ arbitrary })
    case `array`:
      return ArrayArbitrary({
        arbitrary,
        sharedArbitraries,
        activeArbitraryGroup,
      })
    case `dictionary`:
      return DictionaryArbitrary({
        arbitrary,
        sharedArbitraries,
        activeArbitraryGroup,
      })
    case `union`:
      return UnionArbitrary({
        arbitrary,
        sharedArbitraries,
        activeArbitraryGroup,
      })
    case `record`:
      return RecordArbitrary({
        arbitrary,
        sharedArbitraries,
        activeArbitraryGroup,
      })
    case `intersection`:
      return IntersectionArbitrary({
        arbitrary,
        sharedArbitraries,
        activeArbitraryGroup,
      })
    case `reference`:
      return Arbitrary({
        arbitrary: arbitrary.arbitrary,
        sharedArbitraries,
        activeArbitraryGroup,
      })
    case `recursive-reference`:
      return code`tie(${StringLiteral({ string: arbitrary.deref().name })})`
  }
}

const NeverArbitrary = (): Child => code`
  fc.constant(null).map(() => {
    throw new Error('never');
  })
`

const AnythingArbitrary = (): Child => code`fc.anything()`

const ConstantArbitrary = ({
  arbitrary,
}: {
  arbitrary: ConstantArbitrary
}): Child =>
  CallExpression({
    name: `fc.constant`,
    args: [ts.ValueExpression({ jsValue: arbitrary.value })],
  })

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

  return CallExpression({
    name: `fc.${name}`,
    args: [
      ObjectExpression({
        properties: { min: arbitraryMin, max: arbitraryMax },
      }),
    ],
  })
}

const BigIntArbitrary = ({
  arbitrary,
}: {
  arbitrary: BigIntArbitrary
}): Child =>
  CallExpression({
    name: `fc.bigInt`,
    args: [
      ObjectExpression({
        properties: {
          min: arbitrary.min == null ? null : `${arbitrary.min}n`,
          max: arbitrary.max == null ? null : `${arbitrary.max}n`,
        },
      }),
    ],
  })

const StringArbitrary = ({
  arbitrary,
}: {
  arbitrary: StringArbitrary
}): Child =>
  CallExpression({
    name: `fc.string`,
    args: [
      ObjectExpression({
        properties: {
          minLength: arbitrary.minLength,
          maxLength: arbitrary.maxLength,
        },
      }),
    ],
  })

const UrlArbitrary = (): Child => code`fc.webUrl()`

const BytesArbitrary = (): Child => code`fc.uint8Array()`

const EnumArbitrary = ({ arbitrary }: { arbitrary: EnumArbitrary }): Child =>
  CallExpression({
    name: `fc.constantFrom`,
    args: arbitrary.members.map(value =>
      typeof value === `string`
        ? StringLiteral({ string: value })
        : String(value),
    ),
    oneLine: true,
  })

const ArrayArbitrary = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: ArrayArbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child =>
  CallExpression({
    name: `fc.array`,
    args: [
      Arbitrary({
        arbitrary: arbitrary.value,
        sharedArbitraries,
        activeArbitraryGroup,
      }),
      ObjectExpression({
        properties: {
          minLength: arbitrary.minItems,
          maxLength: arbitrary.maxItems,
        },
      }),
    ],
    oneLine: true,
  })

const DictionaryArbitrary = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: DictionaryArbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child => {
  const Key = Arbitrary({
    arbitrary: arbitrary.key,
    sharedArbitraries,
    activeArbitraryGroup,
  })
  const Value = Arbitrary({
    arbitrary: arbitrary.value,
    sharedArbitraries,
    activeArbitraryGroup,
  })
  return CallExpression({
    name: `fc.dictionary`,
    args: [Key, Value],
    oneLine: true,
  })
}

const UnionArbitrary = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: UnionArbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child =>
  CallExpression({
    name: `fc.oneof`,
    args: arbitrary.variants.map(variant =>
      Arbitrary({
        arbitrary: variant,
        sharedArbitraries,
        activeArbitraryGroup,
      }),
    ),
  })

const RecordArbitrary = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: RecordArbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child => {
  const requiredProperties = pipe(
    arbitrary.properties,
    filter(([, property]) => property.required),
    map(([name]) => name),
    reduce(toSet()),
  )

  return CallExpression({
    name: `fc.record`,
    args: [
      ObjectExpression({
        properties: pipe(
          arbitrary.properties,
          map(([name, { arbitrary }]) => [
            name,
            Arbitrary({ arbitrary, sharedArbitraries, activeArbitraryGroup }),
          ]),
          reduce(toObject()),
        ),
        emitEmpty: true,
      }),
      requiredProperties.size === arbitrary.properties.size
        ? null
        : ObjectExpression({
            properties:
              requiredProperties.size === 0
                ? { withDeletedKeys: `true` }
                : {
                    requiredKeys: ArrayExpression({
                      values: pipe(
                        requiredProperties,
                        map(property => StringLiteral({ string: property })),
                        reduce(toArray()),
                      ),
                    }),
                  },
          }),
    ],
  })
}

const IntersectionArbitrary = ({
  arbitrary,
  sharedArbitraries,
  activeArbitraryGroup,
}: {
  arbitrary: IntersectionArbitrary
  sharedArbitraries: SharedArbitraries
  activeArbitraryGroup: Set<ReferenceArbitrary>
}): Child => code`
  fc
    ${CallExpression({
      name: `.tuple`,
      args: arbitrary.arbitraries.map(arbitrary =>
        Arbitrary({ arbitrary, sharedArbitraries, activeArbitraryGroup }),
      ),
    })}
    .map(values => Object.assign(...values))
`

const ArrayExpression = ({ values }: { values: Child[] }): Child =>
  code`[${ayJoin(values, { joiner: `, ` })}]`

const ObjectExpression = ({
  properties,
  emitEmpty = false,
}: {
  properties: Record<string, Children>
  emitEmpty?: boolean
}): Child => {
  const filteredProperties = pipe(
    entries(properties),
    filter(([, value]) => value != null),
    reduce(toMap()),
  )
  switch (filteredProperties.size) {
    case 0:
      return emitEmpty ? `{}` : ``
    case 1: {
      const [name, value] = get(first(filteredProperties))
      return code`{ ${ts.ObjectProperty({
        name,
        // https://github.com/alloy-framework/alloy/issues/42
        value: typeof value === `number` ? String(value) : value,
      })} }`
    }
    default:
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
}

const CallExpression = ({
  name,
  args,
  oneLine = false,
}: {
  name: string
  args: Child[]
  oneLine?: boolean
}): Child => {
  args = filterChildren(args)
  return !oneLine && args.length >= 2
    ? code`
        ${name}(
          ${ayMapJoin(args, arg => code`${arg},`, { joiner: `\n` })}
        )
      `
    : code`${name}(${ayJoin(args, { joiner: `, ` })})`
}

const StringLiteral = ({ string }: { string: string }): Child =>
  `'${string.replace(
    new RegExp(
      `[${pipe(
        keys(escapes),
        map(c => (c === `\\` ? `\\\\` : c)),
        join(``),
      )}]`,
      `gu`,
    ),
    c => escapes[c]!,
  )}'`

const escapes: Record<string, string> = {
  "'": `\\'`,
  '\\': `\\\\`,
  '\b': `\\b`,
  '\f': `\\f`,
  '\n': `\\n`,
  '\r': `\\r`,
  '\t': `\\t`,
  '\v': `\\x0B`,
}

const filterChildren = (children: Child[]): Child[] =>
  children.filter(child => child != null && child !== `` && child !== false)

export default ArbitraryFile
