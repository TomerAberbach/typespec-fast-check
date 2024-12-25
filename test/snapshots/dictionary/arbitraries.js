import * as fc from "fast-check";

export const Dictionary = fc.dictionary(fc.string(), fc.integer());
