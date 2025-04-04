import React from 'react';

import { useFormikContext } from 'formik';

const deepEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const defaultShouldTriggerErrors = (errors, nextErrors) => !deepEquals(errors, nextErrors);

export const ErrorListener = ({ onError, shouldTriggerErrors: _shouldTriggerErrors }) => {
  const shouldTriggerErrors = _shouldTriggerErrors || defaultShouldTriggerErrors;
  const formik = useFormikContext();
  const [errors, updateErrors] = React.useState(formik.errors);

  React.useEffect(() => {
    if (!formik.isSubmitting && !formik.isValidating) {
      if (shouldTriggerErrors(errors, formik.errors)) {
        onError(formik.errors);
        updateErrors(errors);
      }
    }
  }, [formik.isSubmitting, formik.isValidating, formik.errors]);

  return null;
};

export default ErrorListener;
