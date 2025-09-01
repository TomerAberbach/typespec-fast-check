import { defineConfig } from 'tsdown/config'

export default defineConfig([
  {
    entry: `src/index.ts`,
    platform: `node`,
    sourcemap: `inline`,
    publint: true,
  },
  {
    entry: `src/index.ts`,
    dts: { emitDtsOnly: true },
  },
  {
    entry: `src/testing/index.ts`,
    outDir: `dist/testing`,
    platform: `node`,
    sourcemap: `inline`,
    publint: true,
  },
  {
    entry: `src/testing/index.ts`,
    outDir: `dist/testing`,
    dts: { emitDtsOnly: true },
  },
])
