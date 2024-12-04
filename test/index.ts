import { join } from 'node:path'
import { beforeEach, expect, test } from 'vitest'
import { createTestHost, createTestWrapper } from '@typespec/compiler/testing'
import type { BasicTestRunner } from '@typespec/compiler/testing'
import { FastCheckTestLibrary } from '../dist/testing/index.js'

let runner: BasicTestRunner
beforeEach(async () => {
  runner = createTestWrapper(
    await createTestHost({ libraries: [FastCheckTestLibrary] }),
    { compilerOptions: { emit: [`typespec-fast-check`] } },
  )
})

test.each([
  { name: `empty`, code: `` },
  {
    name: `empty-namespace`,
    code: `
      namespace PetStore;
    `,
  },
  {
    name: `empty-model`,
    code: `
      model Pet {}
    `,
  },
] satisfies { name: string; code: string }[])(
  `$name`,
  async ({ name, code }) => {
    const emitted = await emit(code)

    await expect(emitted).toMatchFileSnapshot(`snapshots/${name}.js`)
  },
)

const emit = async (code: string): Promise<string> => {
  const outputDir = `/out`
  await runner.compile(code, { outputDir, noEmit: false })
  const file = runner.fs.get(
    join(outputDir, `typespec-fast-check/arbitraries.js`),
  )
  expect(file).toBeDefined()
  return file!
}
