import * as fc from 'fast-check';

const group = fc.letrec(tie => ({
  Tree: fc.record(
    {
      value: fc.integer(),
      left: tie('Tree'),
      right: fc.oneof(
        tie('StringNode'),
        tie('Tree'),
      ),
    },
    { requiredKeys: ['value'] },
  ),
  StringNode: fc.record(
    {
      value: fc.string(),
      next: tie('BooleanNode'),
    },
    { requiredKeys: ['value'] },
  ),
  BooleanNode: fc.record(
    {
      value: fc.boolean(),
      next: fc.oneof(
        tie('StringNode'),
        tie('Tree'),
      ),
    },
    { requiredKeys: ['value'] },
  ),
}));
export const Tree = group.Tree;
export const StringNode = group.StringNode;
export const BooleanNode = group.BooleanNode;
