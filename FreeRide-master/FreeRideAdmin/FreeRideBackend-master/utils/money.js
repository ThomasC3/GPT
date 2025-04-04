
export const moneyFormat = (value,
  { currency = 'usd', formatCurrency = 'en-US' } = {}) => new Intl.NumberFormat(formatCurrency, { style: 'currency', currency })
  .format(value);

export default {
  moneyFormat
};
