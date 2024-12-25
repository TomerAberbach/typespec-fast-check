import * as fc from "fast-check";

export const Integer = fc.bigInt();

export const MinValueInteger = fc.bigInt({
  min: 92233720368547758000n,
});

export const MinValue0Integer = fc.bigInt({
  min: 0n,
});

export const MaxValueInteger = fc.bigInt({
  max: 922337203685477580000n,
});

export const MinMaxValueInteger = fc.bigInt({
  min: 92233720368547758000n,
  max: 922337203685477580000n,
});
