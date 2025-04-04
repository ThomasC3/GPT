export const parseGender = (gender) => {
  let result = '';
  switch (gender) {
  case 'male':
    result = 'male';
    break;
  case 'female':
    result = 'female';
    break;
  default:
    result = 'unspecified';
  }

  return result;
};

export default {
  parseGender
};
