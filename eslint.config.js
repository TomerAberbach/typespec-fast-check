import eslintConfig from 'tomer/eslint'

export default [
  { ignores: [`**/snapshots/**/*`, `examples/**/*`] },
  ...eslintConfig,
]
