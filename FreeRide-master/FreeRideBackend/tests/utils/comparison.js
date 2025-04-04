import sinon from 'sinon';

export const compareError = (
  error, stringMessage, translationMessage, translationKey, expectedParams
) => {
  const { message, errorKey, errorParams } = error;
  const spy = sinon.spy();
  let actual;
  if (expectedParams) {
    const expectedParamsArray = Object.keys(expectedParams)
      .sort().map(item => [item, expectedParams[item]]);
    const actualParamsArray = Object.keys(errorParams)
      .sort().map(item => [item, errorParams[item]]);
    spy([message, message, errorKey, actualParamsArray]);
    actual = [stringMessage, translationMessage, translationKey, expectedParamsArray];
  } else {
    spy([message, message, errorKey]);
    actual = [stringMessage, translationMessage, translationKey];
  }
  return sinon.assert.calledWith(spy, sinon.match.array.deepEquals(actual));
};

export default {
  compareError
};
