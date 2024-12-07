import * as fc from 'fast-check';

export const $Model = fc.record({
  property: fc.anything(),
});