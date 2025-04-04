import * as React from 'react';
import PropTypes from 'prop-types';
import { DatePicker } from 'antd';
import { FormItem } from '../../elements';

const DateField = ({
  field: { onChange, ...field },
  form: {
    touched, errors, setFieldValue, setFieldTouched
  }, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
  label,
  useNumberComponent = false,
  ...props
}) => {
  const errorMsg = touched[field.name] && errors[field.name];

  const Comp = DatePicker;
  return (
    <FormItem
      label={label}
      help={errorMsg}
      validateStatus={errorMsg ? 'error' : undefined}
    >
      <Comp
        {...field}
        onBlur={undefined}
        {...props}
        onChange={(newValue, dateString) => setFieldValue(field.name, dateString)}
        onOpenChange={() => {
          setFieldTouched(field.name);
        }}
      />
    </FormItem>
  );
};

DateField.propTypes = {

  label: PropTypes.string,
  format: PropTypes.string.isRequired
};

DateField.defaultProps = {
  size: 'small'
};

export default DateField;
