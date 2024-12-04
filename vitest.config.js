import config from 'tomer/vitest'

export default {
  ...config,
  test: {
    ...config.test,
    exclude: [...config.test.exclude, `**/snapshots/**/*`],
  },
}
