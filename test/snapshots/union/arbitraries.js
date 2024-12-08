import * as fc from 'fast-check';

export const Breed = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
);
