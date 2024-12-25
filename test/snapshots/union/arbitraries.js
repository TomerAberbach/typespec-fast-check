import * as fc from "fast-check";

export const $Union = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
);
