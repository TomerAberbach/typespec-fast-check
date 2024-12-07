import * as fc from 'fast-check'

export const Breed = fc.string({
  minLength: 2,
});