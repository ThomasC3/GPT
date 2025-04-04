export const average = (input) => {
  if (input.length < 1) {
    return null;
  }
  let output = 0;
  for (let i = 0; i < input.length; i += 1) {
    output += Number(input[i]);
  }
  return output / input.length;
};

export const sum = (input) => {
  let output = 0;
  for (let i = 0; i < input.length; i += 1) {
    output += Number(input[i]);
  }
  return output;
};

export const perc = (input, pctl) => {
  if (!input || !input.length) { return null; }

  return input.sort((a, b) => a - b)[Math.floor(input.length * pctl)];
};

export const addToObject = (totalObj, obj) => {
  const keys = Object.keys(obj);
  const addedObj = Object.assign({}, ...keys.map(k => ({ [k]: (totalObj[k] || 0) + obj[k] })));
  return { ...totalObj, ...addedObj };
};

export const isNumber = v => !Number.isNaN(v) && Number.isFinite(v);

export const calculateIntervals = readings => ({
  avg: average(readings),
  p30: perc(readings, 0.30),
  p40: perc(readings, 0.40),
  p60: perc(readings, 0.60),
  p70: perc(readings, 0.70)
});

export default {
  average,
  sum,
  perc,
  addToObject,
  isNumber,
  calculateIntervals
};
