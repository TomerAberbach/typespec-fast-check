import * as fc from 'fast-check';

export const M = fc.record({
  property: fc.constant(null).map(() => {
    throw new Error('never');
  }),
});