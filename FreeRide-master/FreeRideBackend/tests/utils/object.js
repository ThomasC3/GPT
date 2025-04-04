export const populateParams = (paramsObject, defaultsObject) => {
  const params = { ...paramsObject };
  const allKeys = Object.keys(defaultsObject);
  let key;
  for (let i = 0; i < allKeys.length; i += 1) {
    key = allKeys[i];
    if (!Object.keys(params).includes(key)) {
      params[key] = defaultsObject[key];
    }
  }
  return params;
};

export default {
  populateParams
};
