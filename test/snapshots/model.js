import * as fc from 'fast-check'

export const Dog = fc.record({
  name: fc.string({
    minLength: 1,
  }),
  age: fc.integer(),
});