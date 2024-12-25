import * as fc from 'fast-check';

const int64 = fc.bigInt({
  min: -9223372036854775808n,
  max: 9223372036854775807n,
});

const int16 = fc.integer({
  min: -32768,
  max: 32767,
});

const int8 = fc.integer({
  min: -128,
  max: 127,
});

export const FirstInt8 = int8;

export const SecondInt8 = int8;

export const ThirdInt8 = fc.integer({
  min: 42,
  max: 127,
});

export const FirstInt16 = int16;

export const SecondInt16 = int16;

export const ThirdInt16 = fc.integer({
  min: 42,
  max: 32767,
});

export const FirstInt32 = fc.integer();

export const SecondInt32 = fc.integer();

export const ThirdInt32 = fc.integer({ min: 42 });

export const FirstSafeInt = fc.maxSafeInteger();

export const SecondSafeInt = fc.maxSafeInteger();

export const ThirdSafeInt = fc.integer({
  min: 42,
  max: 9007199254740991,
});

export const FirstInt64 = int64;

export const SecondInt64 = int64;

export const ThirdInt64 = fc.bigInt({
  min: 42n,
  max: 9223372036854775807n,
});

export const FirstInteger = fc.bigInt();

export const SecondInteger = fc.bigInt();

export const ThirdInteger = fc.bigInt({ min: 42n });

export const FirstFloat32 = fc.float();

export const SecondFloat32 = fc.float();

export const ThirdFloat32 = fc.float({ min: 42 });

export const FirstFloat64 = fc.double();

export const SecondFloat64 = fc.double();

export const ThirdFloat64 = fc.double({ min: 42 });

export const FirstDecimal128 = fc.double();

export const SecondDecimal128 = fc.double();

export const ThirdDecimal128 = fc.double({ min: 42 });

export const FirstDecimal = fc.double();

export const SecondDecimal = fc.double();

export const ThirdDecimal = fc.double({ min: 42 });

export const FirstNumeric = fc.double();

export const SecondNumeric = fc.double();

export const ThirdNumeric = fc.double({ min: 42 });
