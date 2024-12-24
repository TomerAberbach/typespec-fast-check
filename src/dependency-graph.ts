import {
  filter,
  filterMap,
  first,
  get,
  map,
  pipe,
  reduce,
  toArray,
  toSet,
  values,
} from 'lfi'
import stronglyConnectedComponents from '@rtsao/scc'
import type {
  Arbitrary,
  ArbitraryNamespace,
  ReferenceArbitrary,
} from './arbitrary.ts'

export const collectSharedArbitraries = (
  namespace: ArbitraryNamespace,
): Set<ReferenceArbitrary> => {
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

    const remainingArbitraries: Arbitrary[] = [
      ...namespace.arbitraryToName.keys(),
    ]
    while (remainingArbitraries.length > 0) {
      const arbitrary = remainingArbitraries.pop()!
      if (arbitraryDependencies.has(arbitrary)) {
        continue
      }

      const dependencies = getDirectArbitraryDependencies(arbitrary)
      arbitraryDependencies.set(arbitrary, new Set(dependencies))

      for (const referencedArbitrary of dependencies) {
        remainingArbitraries.push(referencedArbitrary)
        arbitraryReferenceCounts.set(
          referencedArbitrary,
          (arbitraryReferenceCounts.get(referencedArbitrary) ?? 0) + 1,
        )
      }
    }
  } while (remainingNamespaces.length > 0)

  return pipe(
    stronglyConnectedComponents(arbitraryDependencies).reverse(),
    filterMap(arbitraries =>
      arbitraries.size === 1 ? get(first(arbitraries)) : null,
    ),
    filter(
      (arbitrary): arbitrary is ReferenceArbitrary =>
        arbitrary.type === `reference` &&
        (arbitraryReferenceCounts.get(arbitrary) ?? 0) >= 2,
    ),
    reduce(toSet()),
  )
}

const getDirectArbitraryDependencies = (arbitrary: Arbitrary): Arbitrary[] => {
  switch (arbitrary.type) {
    case `never`:
    case `anything`:
    case `constant`:
    case `boolean`:
    case `number`:
    case `bigint`:
    case `string`:
    case `url`:
    case `bytes`:
    case `enum`:
      return []
    case `array`:
      return [arbitrary.value]
    case `dictionary`:
      return [arbitrary.key, arbitrary.value]
    case `union`:
      return arbitrary.variants
    case `record`:
      return pipe(
        values(arbitrary.properties),
        map(property => property.arbitrary),
        reduce(toArray()),
      )
    case `intersection`:
      return arbitrary.arbitraries
    case `reference`:
      return [arbitrary.arbitrary]
    case `recursive-reference`:
      return getDirectArbitraryDependencies(arbitrary.deref())
  }
}
