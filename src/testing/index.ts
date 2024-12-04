import {
  createTestLibrary,
  findTestPackageRoot,
} from '@typespec/compiler/testing'

export const FastCheckTestLibrary = createTestLibrary({
  name: `typespec-fast-check`,
  packageRoot: await findTestPackageRoot(import.meta.url),
  jsFileFolder: `dist`,
})
