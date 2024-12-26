// Generated from TypeSpec using `typespec-fast-check`

import * as fc from "fast-check";

export const TemplateUnion = (a, b) =>
  fc.oneof(
    a,
    b,
  );

export const $Model = fc.record({
  instantiatedUnion: TemplateUnion(fc.integer(), fc.string()),
});

export const TemplateModel1 = (a, b) =>
  fc.record({
    a,
    b,
  });

export const TemplateModel2 = (a, b) =>
  fc.record({
    property1: TemplateModel1(a, b),
    property2: fc.oneof(
      a,
      b,
    ),
  });

export const InstantiatedModel1 = TemplateModel1(fc.string(), fc.string());
