// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

const group = fc.letrec(tie => ({
  MultiLineRecursiveModel: fc.record(
    {
      /**
       * Property
       * comment.
       */
      property: tie("MultiLineRecursiveModel"),
    },
    { requiredKeys: [] },
  ),
}));
/**
 * Recursive
 * model comment.
 */
export const MultiLineRecursiveModel = group.MultiLineRecursiveModel;

const group_2 = fc.letrec(tie => ({
  SingleLineRecursiveModel: fc.record(
    {
      /** Property comment. */
      property: tie("SingleLineRecursiveModel"),
    },
    { requiredKeys: [] },
  ),
}));
/** Recursive model comment. */
export const SingleLineRecursiveModel = group_2.SingleLineRecursiveModel;

/**
 * Shared
 * model comment.
 */
export const MultiLineSharedModel = fc.record({});

/** Shared model comment. */
export const SingleLineSharedModel = fc.record({});

/** Namespace comment. */
export const SingleLineNamespace = {
  /** Nested namespace comment. */
  SingleLineNestedNamespace: {},
  
  /** Namespace model comment. */
  SingleLineNamespaceModel: fc.record({}),
};

/**
 * Namespace
 * comment.
 */
export const MultiLineNamespace = {
  /**
   * Nested
   * namespace comment.
   */
  MultiLineNestedNamespace: {},
  
  /**
   * Namespace
   * model comment.
   */
  MultiLineNamespaceModel: fc.record({}),
};

/** Scalar comment. */
export const SingleLineScalar = fc.string();

/**
 * Scalar
 * comment.
 */
export const MultiLineScalar = fc.string();

/** Enum comment. */
export const SingleLineEnum = fc.constant("A");

/**
 * Enum
 * comment.
 */
export const MultiLineEnum = fc.constant("A");

/** Union comment. */
export const SingleLineUnion = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
);

/**
 * Union
 * comment.
 */
export const MultiLineUnion = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
);

/** Non-shared model comment. */
export const SingleLineNonSharedModel = fc.record({
  /** Property comment. */
  property: SingleLineSharedModel,
});

/**
 * Non-shared
 * model comment.
 */
export const MultiLineNonSharedModel = fc.record({
  /**
   * Property
   * comment.
   */
  property: MultiLineSharedModel,
});
