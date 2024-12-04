import { createTypeSpecLibrary } from '@typespec/compiler'

export const $lib = createTypeSpecLibrary({
  name: `typespec-fast-check`,
  diagnostics: {},
})
