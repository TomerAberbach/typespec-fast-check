import { join } from 'node:path'
import { beforeEach, expect, test } from 'vitest'
import { createTestHost, createTestWrapper } from '@typespec/compiler/testing'
import type { BasicTestRunner } from '@typespec/compiler/testing'
import * as fc from 'fast-check'
import { entries, filterMap, pipe, reduce, toObject } from 'lfi'
import { importFromString } from 'module-from-string'
import { serializeError } from 'serialize-error'
import jsesc from 'jsesc'
import { FastCheckTestLibrary } from '../dist/testing/index.js'

let runner: BasicTestRunner
beforeEach(async () => {
  runner = createTestWrapper(
    await createTestHost({ libraries: [FastCheckTestLibrary] }),
    { compilerOptions: { emit: [`typespec-fast-check`] } },
  )
})

type TestCase = { name: string; code: string }

test.each([
  { name: `empty`, code: `` },

  // Namespace and model nesting
  {
    name: `file-namespace`,
    code: `
      namespace PetStore;
    `,
  },
  {
    name: `namespace`,
    code: `
      namespace PetStore {}
    `,
  },
  {
    name: `namespace-in-file-namespace`,
    code: `
      namespace PetStore;

      namespace Pets {}
    `,
  },
  {
    name: `file-model`,
    code: `
      model Pet {}
    `,
  },
  {
    name: `model-in-namespace`,
    code: `
      namespace PetStore;

      model Pet {}
    `,
  },
  {
    name: `model-and-namespace`,
    code: `
      namespace PetStore {}

      model Pet {}
    `,
  },

  // Data types
  {
    name: `null`,
    code: `
      model $Model {
        property: null
      }
    `,
  },
  {
    name: `void`,
    code: `
      model $Model {
        property: void
      }
    `,
  },
  {
    name: `never`,
    code: `
      model $Model {
        property: never
      }
    `,
  },
  {
    name: `never-sharing`,
    code: `
      model $Model {
        property1: never,
        property2: never
      }
    `,
  },
  {
    name: `unknown`,
    code: `
      model $Model {
        property: unknown
      }
    `,
  },
  {
    name: `boolean`,
    code: `
      scalar Boolean extends boolean;
    `,
  },
  {
    name: `int8`,
    code: `
      scalar Int8 extends int8;

      @minValue(-10)
      scalar MinValueInt8 extends int8;

      @minValue(0)
      scalar Min0ValueInt8 extends int8;

      @maxValue(20)
      scalar MaxValueInt8 extends int8;

      @minValue(-10)
      @maxValue(20)
      scalar MinMaxValueInt8 extends int8;

      @minValue(-300)
      @maxValue(400)
      scalar RedundantlyMinMaxValueInt8 extends int8;
    `,
  },
  {
    name: `int16`,
    code: `
      scalar Int16 extends int16;

      @minValue(-200)
      scalar MinValueInt16 extends int16;

      @minValue(0)
      scalar Min0ValueInt16 extends int16;

      @maxValue(345)
      scalar MaxValueInt16 extends int16;

      @minValue(-200)
      @maxValue(345)
      scalar MinMaxValueInt16 extends int16;

      @minValue(-40000)
      @maxValue(40000)
      scalar RedundantlyMinMaxValueInt16 extends int16;
    `,
  },
  {
    name: `int32`,
    code: `
      scalar Int32 extends int32;

      @minValue(-40000)
      scalar MinValueInt32 extends int32;

      @minValue(0)
      scalar Min0ValueInt32 extends int32;

      @maxValue(40000)
      scalar MaxValueInt32 extends int32;

      @minValue(-40000)
      @maxValue(40000)
      scalar MinMaxValueInt32 extends int32;

      @minValue(-2147483650)
      @maxValue(2147483650)
      scalar RedundantlyMinMaxValueInt32 extends int32;
    `,
  },
  {
    name: `safeint`,
    code: `
      scalar SafeInt extends safeint;

      @minValue(-40000)
      scalar MinValueSafeInt extends safeint;

      @minValue(0)
      scalar Min0ValueSafeInt extends safeint;

      @maxValue(40000)
      scalar MaxValueSafeInt extends safeint;

      @minValue(-40000)
      @maxValue(40000)
      scalar MinMaxValueSafeInt extends safeint;

      @minValue(-2147483650)
      @maxValue(2147483650)
      scalar RedundantlyMinMaxValueSafeInt extends safeint;
    `,
  },
  {
    name: `int64`,
    code: `
      scalar Int64 extends int64;

      @minValue(-2147483650)
      scalar MinValueInt64 extends int64;

      // https://github.com/microsoft/typespec/pull/5295
      // @minValue(0)
      // scalar Min0ValueInt64 extends int64;

      @maxValue(2147483650)
      scalar MaxValueInt64 extends int64;

      // https://github.com/microsoft/typespec/pull/5295
      // @minValue(-2147483650)
      // @maxValue(2147483650)
      // scalar MinMaxValueInt64 extends int64;

      // https://github.com/microsoft/typespec/pull/5295
      // @minValue(-9223372036854775809)
      // @maxValue(9223372036854775809)
      // scalar RedundantlyMinMaxValueInt64 extends int64;
    `,
  },
  {
    name: `integer`,
    code: `
      scalar Integer extends integer;

      @minValue(-92233720368547758000)
      scalar MinValueInteger extends integer;

      @minValue(0)
      scalar MinValue0Integer extends integer;

      @maxValue(922337203685477580000)
      scalar MaxValueInteger extends integer;

      @minValue(-92233720368547758000)
      @maxValue(922337203685477580000)
      scalar MinMaxValueInteger extends integer;
    `,
  },
  {
    name: `float32`,
    code: `
      scalar Float32 extends float32;

      @minValue(-3.14)
      scalar MinValueFloat32 extends float32;

      @minValue(0)
      scalar MinValue0Float32 extends float32;

      @maxValue(3.14)
      scalar MaxValueFloat32 extends float32;

      @minValue(-3.14)
      @maxValue(3.14)
      scalar MinMaxValueFloat32 extends float32;

      @minValue(-3.4e+39)
      @maxValue(3.4e+39)
      scalar RedundantlyMinMaxValueFloat32 extends float32;
    `,
  },
  {
    name: `float64`,
    code: `
      scalar Float64 extends float64;

      @minValue(-3.4e+39)
      scalar MinValueFloat64 extends float64;

      @maxValue(3.4e+39)
      scalar MaxValueFloat64 extends float64;

      @minValue(-3.4e+39)
      @maxValue(3.4e+39)
      scalar MinMaxValueFloat64 extends float64;
    `,
  },
  {
    name: `decimal128`,
    code: `
      scalar Decimal128 extends decimal128;

      @minValue(-3.4e+39)
      scalar MinValueDecimal128 extends decimal128;

      @maxValue(3.4e+39)
      scalar MaxValueDecimal128 extends decimal128;

      @minValue(-3.4e+39)
      @maxValue(3.4e+39)
      scalar MinMaxValueDecimal128 extends decimal128;
    `,
  },
  {
    name: `decimal`,
    code: `
      scalar Decimal extends decimal;

      @minValue(-3.4e+39)
      scalar MinValueDecimal extends decimal;

      @maxValue(3.4e+39)
      scalar MaxValueDecimal extends decimal;

      @minValue(-3.4e+39)
      @maxValue(3.4e+39)
      scalar MinMaxValueDecimal extends decimal;
    `,
  },
  {
    name: `numeric`,
    code: `
      scalar Numeric extends numeric;

      @minValue(-3.4e+39)
      scalar MinValueNumeric extends numeric;

      @maxValue(3.4e+39)
      scalar MaxValueNumeric extends numeric;

      @minValue(-3.4e+39)
      @maxValue(3.4e+39)
      scalar MinMaxValueNumeric extends numeric;
    `,
  },
  {
    name: `numeric-sharing`,
    code: `
      scalar FirstInt8 extends int8;
      scalar SecondInt8 extends int8;
      @minValue(42)
      scalar ThirdInt8 extends int8;

      scalar FirstInt16 extends int16;
      scalar SecondInt16 extends int16;
      @minValue(42)
      scalar ThirdInt16 extends int16;

      scalar FirstInt32 extends int32;
      scalar SecondInt32 extends int32;
      @minValue(42)
      scalar ThirdInt32 extends int32;

      scalar FirstSafeInt extends safeint;
      scalar SecondSafeInt extends safeint;
      @minValue(42)
      scalar ThirdSafeInt extends safeint;

      scalar FirstInt64 extends int64;
      scalar SecondInt64 extends int64;
      @minValue(42)
      scalar ThirdInt64 extends int64;

      scalar FirstInteger extends integer;
      scalar SecondInteger extends integer;
      @minValue(42)
      scalar ThirdInteger extends integer;

      scalar FirstFloat32 extends float32;
      scalar SecondFloat32 extends float32;
      @minValue(42)
      scalar ThirdFloat32 extends float32;

      scalar FirstFloat64 extends float64;
      scalar SecondFloat64 extends float64;
      @minValue(42)
      scalar ThirdFloat64 extends float64;

      scalar FirstDecimal128 extends decimal128;
      scalar SecondDecimal128 extends decimal128;
      @minValue(42)
      scalar ThirdDecimal128 extends decimal128;

      scalar FirstDecimal extends decimal;
      scalar SecondDecimal extends decimal;
      @minValue(42)
      scalar ThirdDecimal extends decimal;

      scalar FirstNumeric extends numeric;
      scalar SecondNumeric extends numeric;
      @minValue(42)
      scalar ThirdNumeric extends numeric;
    `,
  },
  {
    name: `string`,
    code: `
      scalar String extends string;

      @minLength(1)
      scalar MinLengthString extends string;

      @maxLength(5)
      scalar MaxLengthString extends string;

      @minLength(2)
      @maxLength(7)
      scalar MinAndMaxLengthString extends string;
    `,
  },
  {
    name: `bytes`,
    code: `
      scalar Bytes extends bytes;
    `,
  },

  // Models
  {
    name: `enum`,
    code: `
      enum $Enum {
        A,
        B,
        C,
        D,
      }
      enum StringEnum {
        A: "a",
        B: "b",
        C: "c",
        D: "d",
      }
      enum NumberEnum {
        A: 1,
        B: 2,
        C: 3.14,
        // https://github.com/microsoft/typespec/issues/5296
        D: 4${`0`.repeat(310)},
      }
    `,
  },
  {
    name: `array`,
    code: `
      model $Array is Array<string>;

      @minItems(3)
      model MinItemsArray is Array<string>;

      @minItems(0)
      model Min0ItemsArray is Array<string>;

      @maxItems(12)
      model MaxItemsArray is Array<string>;

      @minItems(3)
      @maxItems(12)
      model MinMaxItemsArray is Array<string>;
    `,
  },
  {
    name: `dictionary`,
    code: `
      model Dictionary is Record<int32>;
    `,
  },
  {
    name: `union`,
    code: `
      union Breed {
        string: string,
        int32: int32,
        boolean: boolean
      }
    `,
  },
  {
    name: `model`,
    code: `
      model $Model {
        a: int32,
        b: string
      }
    `,
  },
  {
    name: `model-is`,
    code: `
      model Model1 {
        a: int32
      }

      model Model2 is Model1;
      model Model3 is Model1 {
        b: string
      }
    `,
  },
  {
    name: `model-spread`,
    code: `
      model Model1 {
        a: int32
      }

      model Model2 {
        b: string
      }

      model $Model {
        ...Model1,
        ...Model2,
        c: string,
        ...Record<boolean>
      }
    `,
  },
  {
    name: `model-optional-property`,
    code: `
      model EmptyModel {}

      model AllRequiredModel {
        a: int32,
        b: string,
        c: string
      }

      model AllOptionalModel {
        a?: int32,
        b?: string,
        c?: int64
      }

      model SomeOptionalModel {
        a?: int32,
        b: string,
        c?: int64
      }
    `,
  },
] satisfies TestCase[])(`$name`, async ({ name, code }) => {
  const snapshotPath = `./snapshots/${name}`
  const arbitrariesPath = `${snapshotPath}/arbitraries.js`
  const arbitrarySamplesPath = `${snapshotPath}/samples.js`

  const emitted = await emitArbitraries(code)

  await expect(emitted).toMatchFileSnapshot(arbitrariesPath)
  await expect(emitArbitrarySamples(emitted)).resolves.toMatchFileSnapshot(
    arbitrarySamplesPath,
  )
})

const emitArbitraries = async (code: string): Promise<string> => {
  const outputDir = `/out`
  await runner.compile(code, { outputDir, noEmit: false })
  const file = runner.fs.get(
    join(outputDir, `typespec-fast-check/arbitraries.js`),
  )
  expect(file).toBeDefined()
  return file!
}

const emitArbitrarySamples = async (code: string): Promise<string> => {
  const arbitraries = (await importFromString(code)) as Record<
    PropertyKey,
    unknown
  >
  const arbitrarySamples = sampleArbitraries(arbitraries)
  return `export const samples = ${jsesc(arbitrarySamples, {
    compact: false,
  })};\n`
}

const sampleArbitraries = (
  arbitraries: Record<PropertyKey, unknown>,
): Record<PropertyKey, unknown> =>
  pipe(
    entries(arbitraries),
    filterMap(([name, value]) => {
      if (value === null || typeof value !== `object`) {
        return null
      }

      return [
        name,
        isArbitrary(value)
          ? trySample(value)
          : sampleArbitraries(value as Record<PropertyKey, unknown>),
      ]
    }),
    reduce(toObject()),
  )

const isArbitrary = (value: object): value is fc.Arbitrary<unknown> =>
  `generate` in value

const trySample = (value: fc.Arbitrary<unknown>): unknown => {
  try {
    return fc.sample(value, { seed: 42, numRuns: 5 })
  } catch (error: unknown) {
    const { name, message } = serializeError(error)
    return `[${name}: ${message}]`
  }
}
