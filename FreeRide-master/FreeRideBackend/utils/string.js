import toNumber from 'lodash/toNumber';

// $& means the whole matched string
export const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const typeConverter = (value, type) => {
  if (value === undefined || value === null) {
    throw new Error('Invalid value');
  }
  if (type === 'number') {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(value)) throw new Error('Invalid number value');
    return toNumber(value);
  }
  if (type === 'boolean') {
    if (value === true || value === false) {
      return value;
    }
    if (typeof value !== 'string') {
      throw new Error('Invalid value');
    }
    const lowerCasedValue = value.toLowerCase();
    if (lowerCasedValue !== 'true' && lowerCasedValue !== 'false') {
      throw new Error('Invalid boolean value');
    }
    return lowerCasedValue === 'true';
  }
  return value;
};

export default {
  escapeRegExp,
  typeConverter
};
