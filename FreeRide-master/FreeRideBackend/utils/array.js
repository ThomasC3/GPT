
export const copy = array => [...array];

export const isArray = x => Array.isArray(x);

export const unique = array => Array.from(new Set(array.map(item => String(item))));

// Fisher-Yates shuffle
export const shuffle = (array) => {
  const shuffledArray = [...array];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

export default {
  copy,
  isArray,
  unique,
  shuffle
};
