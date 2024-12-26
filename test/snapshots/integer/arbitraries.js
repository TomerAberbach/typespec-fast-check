// Generated from TypeSpec using `typespec-fast-check`

import fc from "fast-check";

export const Integer = fc.bigInt();

export const MinValueInteger = fc.bigInt({ min: 92233720368547758000n });

export const MinValueExclusiveInteger = fc.bigInt({ min: 92233720368547758001n });

export const Min0ValueInteger = fc.bigInt({ min: 0n });

export const MinNegative1ValueExclusiveInteger = fc.bigInt({ min: 2n });

export const MaxValueInteger = fc.bigInt({ max: 922337203685477580000n });

export const MaxValueExclusiveInteger = fc.bigInt({ max: 922337203685477579999n });

export const MinMaxValueInteger = fc.bigInt({
  min: 92233720368547758000n,
  max: 922337203685477580000n,
});

export const MinMaxValueExclusiveInteger = fc.bigInt({
  min: 92233720368547758001n,
  max: 922337203685477579999n,
});
