// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

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
const StringNode = group.StringNode;
const BooleanNode = group.BooleanNode;

export const $Namespace = {
  StringNode: StringNode,
  
  BooleanNode: BooleanNode,
};
