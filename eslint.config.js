import eslintConfig from '@tomer/eslint-config'

export default [
  { ignores: [`**/snapshots/**/*`, `**/fixtures/**/*`] },
  ...eslintConfig,
]
