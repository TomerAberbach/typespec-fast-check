import * as fc from 'fast-check';

const group = fc.letrec(tie => ({ Node: fc.record(
  {
    value: fc.string(),
    next: tie('Node'),
  },
  { requiredKeys: ['value'] },
) }));
export const Node = group.Node;
