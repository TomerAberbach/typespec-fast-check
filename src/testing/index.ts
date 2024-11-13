import { resolvePath } from "@typespec/compiler";
import {
  createTestLibrary,
  TypeSpecTestLibrary,
} from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const TspFastCheckTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "tsp-fast-check",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
});
