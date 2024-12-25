import * as fc from 'fast-check';

const group = fc.letrec(tie => ({ Model3: fc.record(
  { property: tie('Model3') },
  { withDeletedKeys: true },
) }));
/** Recursive model comment. */
export const Model3 = group.Model3;

/** Shared model comment. */
export const Model1 = fc.record({});

/** Namespace comment. */
export const Namespace1 = {
  /** Nested namespace comment. */
  Namespace2: {},
  
  /** Namespace model comment. */
  Model4: fc.record({}),
};

/** Non-shared model comment. */
export const Model2 = fc.record({ property: Model1 });
