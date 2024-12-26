// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

const group = fc.letrec(tie => ({
  StringNode: fc.record(
    {
      value: fc.string(),
      next: tie("BooleanNode"),
    },
    {
      requiredKeys: ["value"],
    },
  ),
  BooleanNode: fc.record(
    {
      value: fc.boolean(),
      next: tie("StringNode"),
    },
    {
      requiredKeys: ["value"],
    },
  ),
}));
export const StringNode = group.StringNode;
export const BooleanNode = group.BooleanNode;

const group_2 = fc.letrec(tie => ({
  Tree: fc.record(
    {
      value: fc.integer(),
      left: tie("Tree"),
      right: fc.oneof(
        tie("Tree"),
        StringNode,
      ),
    },
    {
      requiredKeys: ["value"],
    },
  ),
}));
export const Tree = group_2.Tree;
