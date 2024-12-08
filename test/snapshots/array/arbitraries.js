import * as fc from 'fast-check';

export const $Array = fc.array(fc.string());

export const MinItemsArray = fc.array(fc.string(), {
  minLength: 3,
});

export const Min0ItemsArray = fc.array(fc.string());

export const MaxItemsArray = fc.array(fc.string(), {
  maxLength: 12,
});

export const MinMaxItemsArray = fc.array(fc.string(), {
  minLength: 3,
  maxLength: 12,
});