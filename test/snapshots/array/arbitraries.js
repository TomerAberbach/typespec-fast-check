import * as fc from 'fast-check';

const string = fc.string();

const Array = fc.array(string);

export const $Array = Array;

export const MinItemsArray = fc.array(string, {
  minLength: 3,
});

export const Min0ItemsArray = Array;

export const MaxItemsArray = fc.array(string, {
  maxLength: 12,
});

export const MinMaxItemsArray = fc.array(string, {
  minLength: 3,
  maxLength: 12,
});