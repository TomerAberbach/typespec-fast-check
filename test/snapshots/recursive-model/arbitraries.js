import * as fc from 'fast-check';

export const Node = fc.record(
  {
    value: fc.string(),
    next: fc.constant("TODO"),
  },
  { requiredKeys: ['value'] },
);
