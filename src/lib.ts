import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "tsp-fast-check",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;
